import _ from 'lodash';
import Kefir from 'kefir';
import Immutable from 'immutable';

class AbstractMultiField{
  constructor(fields, name){
    this.key = name;
    this.fields = {};
    this.initFields(fields);
  }

  reset(){
    _.each(this.fields, field => field.reset());
  }

  hasBeenModified(state){
    return _.any(state, (subState, name) => {
      let field = this.field(name);
      if(field && field.hasBeenModified) return field.hasBeenModified(subState);
      else return false;
    });
  }

  field(path){
    return _.inject(path.split('/').filter(x => x != ''), function(o, p){return o && o.fields[p]}, this);
  }

  get path(){
    if(!this.parent) return '';
    return `${this.parent.path}/${this.key}`;
  }

  get root(){
    if(!this.parent)return this;
    return this.parent.root;
  }

  initFields(fields){
    for(let field of fields){
      this.fields[field.key] = field;
    }
  }

  combineStates(){
    const commands = Kefir.pool();
    const fields = this.fields;
    const defaultState = Immutable.Map({
      canSubmit: true,
      hasBeenModified: false,
      isLoading: false,
    });

    const mergeChildrenState = (field, state) => {
      return (parentState) => {
        const newParentState = parentState.set(field.key, state);
        const subStates = newParentState.filter( subState =>  Immutable.Map.isMap(subState) && subState.has('canSubmit')).toList();
        const canSubmit = _.all(subStates.map( x => x.get('canSubmit') ).toJS());
        const isLoading = _.some(subStates.map( x => x.get('isLoading')).toJS());
        const hasBeenModified = _.some(subStates.map( x => x.get('hasBeenModified')).toJS());
        return newParentState.merge({ 
          canSubmit: canSubmit, 
          hasBeenModified: hasBeenModified,
          isLoading: isLoading 
        });
      }
    }

    _.each(fields, field => {
      commands.plug(field.state.map( state => mergeChildrenState(field, state)));
    });

    if(this.markStream){
      const markCommand = (value) => {
        return (state) => {
          return state.set('mark', value);
        }
      }
      commands.plug(this.markStream.map(v => markCommand(v)));
    }

    return commands.scan( (state, command) => command(state), defaultState);
  }

  initState(){
    _.each(this.fields, field =>{
      field.initState();
    })
    this.state = this.combineStates();
  }
}

export class Formo extends AbstractMultiField{
  constructor(fields=[], document){
    super(fields);
    this.propagateParent();
    this.document = document;

    this.markStream = Kefir.pool();
    this.initState();
    
    this.submitStream = Kefir.pool();
    this.submitted = this.state.sampledBy(this.submitStream, (state, options) => {
      return state.set('submitOptions', options);
    });

    this.cancelStream = Kefir.pool();
    this.cancelled = this.state.sampledBy(this.cancelStream, (state, options) => {
      return state.set('cancelOptions', options);
    });
  }

  propagateParent(){
    function propagate(parent){
      if(!parent.fields)return;
      _.each(parent.fields, field =>{
        field.parent = parent;
        propagate(field);
      })
    }
    propagate(this);
  }

  submit(options){
    this.submitStream.plug(Kefir.constant(Immutable.fromJS(options)));
  }

  cancel(options){
    this.cancelStream.plug(Kefir.constant(Immutable.fromJS(options)));
  }

  mark(value){
    this.markStream.plug(Kefir.constant(value));
  }

  getDocumentValue(path){
    if(!this.document) return;
    return _.inject(path.split('/').filter(x => x !== ''), function(d, p){return d && d[p]}, this.document);
  }

  toDocument(state){
    let res = {};
    state.mapEntries(([name, subState]) => {
      if(Immutable.Map.isMap(subState)){
        if(subState.has('value')) res[name] = this.field(subState.get('path')).castedValue(subState.get('value'));
        else res[name] = this.toDocument(subState);
      }
    }); 
   return res;
  }
}

export class MultiField extends AbstractMultiField{
  constructor(name, fields){
    super(fields, name);
  }
}

export class Field{
  constructor(name, schema={}){
    this.schema = schema;
    this.key = name;
  }

  initState(){
    const defaultValue = this.defaultValue;

    const defaultState = Immutable.Map({
        value: defaultValue
      , path: this.path
      , error: this.checkError(defaultValue)
      , canSubmit: !this.checkError(defaultValue)
      , isLoading: 0
      , hasBeenModified: false
    });

    this.newValueStream = Kefir.pool();
    this.resetStream = Kefir.pool();

    const commands = Kefir.pool();

    const checkedValueCommand = (data) => {
      return state => {
        const isLoading = state.get('isLoading') - 1;
        if(state.get('value') !== data.value){
          // value has changed before valueChecker end
          return state.merge({
            isLoading: isLoading,
            canSubmit: !(isLoading || data.error),
            hasBeenModified: this.hasBeenModified(state.get('value')),
          });
        }
        return state.merge({
          error: data.error,
          isLoading: isLoading,
          canSubmit: !(isLoading || data.error),
          hasBeenModified: this.hasBeenModified(state.get('value')),
        });
      }
    }

    const newValueCommand = (value) => {
      return (state) => {
        if(this.schema.valueChecker && !( this.isNull(value) && this.isRequired() )){
          return state.merge({
            value: value, 
            canSubmit: false,
            error: undefined,
            hasBeenModified: this.hasBeenModified(value),
          });
        }
        if(!this.checkValue(value)){
          return state.merge({
            value: value, 
            error: this.getError(value),
            hasBeenModified: this.hasBeenModified(value),
            canSubmit: false,
          });
        }
        return state.merge({
          value: value, 
          error: undefined,
          hasBeenModified: this.hasBeenModified(value),
          canSubmit: !state.get('isLoading'),
        });
      }
    }

    const resetCommand = () => {
      return (state) => {
        return defaultState;
      }
    }

    const isLoadingCommand = () => {
      return (state) => {
        return state.update('isLoading', x => x + 1).set('canSubmit', false);
      }
    }


    commands.plug(this.newValueStream.map(value => newValueCommand(value)));
    commands.plug(this.resetStream.map(value => resetCommand()));


    if(this.schema.valueChecker){
      const stream = this.newValueStream
        .filter(value => !(this.isRequired() && this.isNull(value)))
        .debounce(this.schema.valueChecker.debounce || 10)
        .flatMap( value => {
          commands.plug(Kefir.constant(isLoadingCommand()));
          const ajaxRequest = Kefir.fromPromise(this.schema.valueChecker.checker(value));
          return Kefir.constant(value).combine(ajaxRequest, (value, res) => {
              if(!res.checked) return { error: res.error || 'Wrong Input!', value: value }
              return {value: value, error: undefined};
            })
        })
        commands.plug(stream.map(value => checkedValueCommand(value)));
    }

    this.state = commands.scan( (state, command) => command(state), defaultState);
  }


  castedValue(value){
    switch(this.type){
      case 'number':
      case 'integer':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      default: 
        if(value === '')return;
        return value;
    }
  }

  hasBeenModified(value){
    return this.castedValue(value) !== this.defaultValue;
  }

  checkValue(value){
    if(this.isNull(value)) return !this.isRequired();
    if(this.domainValue) return this.checkDomain(value);
    return this.checkPattern(value);
  }

  checkDomain(value){
    return _.isFunction(this.domainValue) ? this.domainValue(value) : _.contains(this.domainValue, value);
  }

  checkError(value){
    if(!this.checkValue(value)) return this.getError(value);
  }

  checkPattern(value){
    return String(value).match(this.getPattern());
  }

  get domainValue(){
    return this.schema.domainValue;
  }

  get defaultValue(){
    return this.root && this.root.getDocumentValue(this.path) || this.schema.defaultValue;
  }

  get label(){
    return this.schema.label;
  }

  get type(){
    return this.schema.type;
  }

  get path(){
    return `${this.parent.path}/${this.key}`;
  }

  get root(){
    return this.parent && this.parent.root;
  }

  get pattern(){
    return this.schema.pattern;
  }

  getError(value){
    if(this.isNull(value) && this.isRequired()) return "Input required";
    if(this.pattern) return "Input doesn't match pattern!"
    if(this.domainValue) return "Input doesn't match domain value!"
    switch(this.type){
      case 'number':
        return "Input is not a number!";
      case 'integer':
        return "Input is not an integer!";
      case 'boolean':
        return "Input is not an boolean!";
    }
    return "Wrong input!";
  }

  htmlType(){
    switch(this.type){
      case 'number':
      case 'integer':
        return 'text';
      case 'color': return 'color';
      case 'url': return 'url';
      case 'file': return 'file';
      default: return 'text';
    }
  }

  getPattern(){
    return this.pattern || {
        number: /^[0-9]*(\.[0-9]+)?$/
      , integer: /^[0-9]+$/ 
      , boolean: /true|false/ 
      , text: /.*/ 
    }[this.type];
  }

  isNull(value){
    return _.isUndefined(value) || value === "";
  }

  setValue(value){
    this.newValueStream.plug(Kefir.constant(value));
  }

  reset(){
    this.resetStream.plug(Kefir.constant(true));
  }

  isRequired(){
    return this.schema.required;
  }

}
