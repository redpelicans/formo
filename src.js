import _ from 'lodash';
import Kefir from 'kefir';
import Immutable from 'immutable';

class AbstractFieldGroup{
  constructor(fields, name){
    this.key = name;
    this.fields = {};
    this.initFields(fields);
  }

  reset(){
    _.each(this.fields, field => field.reset());
  }

  disabled(value){
    _.each(this.fields, field => field.disabled(value));
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

  onValue(cb){
    let fct;
    this.state.onValue(fct = state =>  cb(state.toJS()) );
    return () => this.state.offValue(fct);
  }

}

export class Formo extends AbstractFieldGroup{
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

  onSubmit(cb){
    let fct;
    this.submitted.onValue(fct = state => cb(state.toJS(), this.toDocument(state)) );
    return () => this.submitted.offValue(fct);
  }

  onCancel(cb){
    let fct;
    this.cancelled.onValue(fct = state => cb(state.toJS()) );
    return () => this.cancelled.offValue(fct);
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
    for(let [name, subState] of state.entries()){
      if(Immutable.Map.isMap(subState)){
        if(subState.has('value')) res[name] = castedValue(subState, subState.get('value'));
        else res[name] = this.toDocument(subState);
      }
    } 
   return res;
  }

}

export class FieldGroup extends AbstractFieldGroup{
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

    let defaultState = Immutable.fromJS({
        value: defaultValue
      , path: this.path
      , isLoading: 0
      , disabled: false
      , hasBeenModified: false
      , type: this.schema.type
      , required: !!this.schema.required
      , pattern: this.schema.pattern
      , domainValue: this.schema.domainValue
      , multiValue: !!this.schema.multiValue
      , checkDomainValue: this.checkDomainValue
    });

    defaultState = defaultState.set('error', checkError(defaultState, defaultValue)); 
    defaultState = defaultState.set('canSubmit', !defaultState.get('error'));

    this.newValueStream = Kefir.pool();
    this.refreshStream = Kefir.pool();
    this.newSchemaValueStream = Kefir.pool();
    this.disabledStream = Kefir.pool();
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
            hasBeenModified: this.hasBeenModified(state, state.get('value')),
          });
        }
        return state.merge({
          error: data.error,
          isLoading: isLoading,
          canSubmit: !(isLoading || data.error),
          hasBeenModified: this.hasBeenModified(state, state.get('value')),
        });
      }
    }

    const newSchemaValueCommand = ({key, value}) => {
      return (state) => {
        const data = state.set(key, Immutable.fromJS(value));
        return data.merge({
          error: getError(data, data.get('value')),
          canSubmit: !(data.get('isLoading') || getError(data, data.get('value'))),
        })
      }
    }

    const newValueCommand = (value) => {
      return (state) => {
        if(this.schema.valueChecker && !( isNull(value) && isRequired(state) )){
          return state.merge({
            value: value, 
            canSubmit: false,
            error: undefined,
            hasBeenModified: this.hasBeenModified(state, value),
          });
        }
        if(!checkValue(state, value)){
          return state.merge({
            value: value, 
            error: getError(state, value),
            hasBeenModified: this.hasBeenModified(state, value),
            canSubmit: false,
          });
        }
        return state.merge({
          value: value, 
          error: undefined,
          hasBeenModified: this.hasBeenModified(state, value),
          canSubmit: !state.get('isLoading'),
        });
      }
    }

    const resetCommand = () => () => defaultState;

    const isLoadingCommand = () => {
      return (state) => {
        return state.update('isLoading', x => x + 1).set('canSubmit', false);
      }
    }

    const disabledCommand = (value) => {
      return (state) => {
        return state.update('disabled', x => value);
      }
    }

    commands.plug(this.newValueStream.map(value => newValueCommand(value)));
    commands.plug(this.newSchemaValueStream.map( obj => newSchemaValueCommand(obj)));
    commands.plug(this.disabledStream.map(value => disabledCommand(value)));
    commands.plug(this.resetStream.map(value => resetCommand()));

    this.state = commands.scan( (state, command) => command(state), defaultState);

    if(this.schema.valueChecker){
      let stream = this.state.sampledBy(this.newValueStream, (state, value) => [state, value])
        .filter( ([state, value]) => !(isRequired(state) && isNull(value)))
        .debounce(this.schema.valueChecker.debounce || 10)
        .flatMap( ([state, value]) => {
          commands.plug(Kefir.constant(isLoadingCommand()));
          const ajaxRequest = Kefir.fromPromise(this.schema.valueChecker.checker(value, this.root.document, state));
          return Kefir.constant(value).combine(ajaxRequest, (value, res) => {
              if(!res.checked) return { error: res.error || 'Wrong Input!', value: value }
              return {value: value, error: undefined};
            })
        })
        commands.plug(stream.map(value => checkedValueCommand(value)));
    }


    this.newValueStream.plug(this.state.sampledBy(this.refreshStream, state => state.get('value')));
  }

  onValue(cb){
    let fct;
    this.state.onValue(fct = state =>  cb(state.toJS()) );
    return () => this.state.offValue(fct);
  }

  get checkDomainValue(){
    return 'checkDomainValue' in this.schema ? this.schema.checkDomainValue : true;
  }

  get defaultValue(){
    return this.root && this.root.getDocumentValue(this.path) || this.schema.defaultValue;
  }

  hasBeenModified(state, value){
    return castedValue(state, value) !== this.defaultValue;
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

  setValue(value){
    this.newValueStream.plug(Kefir.constant(Immutable.fromJS(value)));
  }

  setSchemaValue(key, value){
    this.newSchemaValueStream.plug(Kefir.constant({key: key, value: value}));
  }

  refresh(){
    this.refreshStream.plug(Kefir.constant(true));
  }

  reset(){
    this.resetStream.plug(Kefir.constant(true));
  }

  disabled(value){
    this.disabledStream.plug(Kefir.constant(!!value));
  }
}

function getPattern(state){
  return state.get('pattern') || {
      number: /^[0-9]*(\.[0-9]+)?$/
    , integer: /^[0-9]+$/ 
    , boolean: /true|false/ 
    , text: /.*/ 
  }[state.get('type')];
}

function checkPattern(state, value){
  return !!String(value).match(getPattern(state));
}

function checkValue(state, value){
  const _checkValue = (v) => {
    if(isNull(v)) return !isRequired(state);
    if( hasDomainValue(state) && mustCheckDomainValue(state) ) return checkDomain(state, v);
    return checkPattern(state, v);
  }

  if(isMultiValued(state)){
    if(!value) return _checkValue();
    if(!value.toJS) return false;
    const v = value.toJS();
    if(!_.isArray(v)) return false;
    if(!v.length) return _checkValue();
    return _.all(v , x =>  _checkValue(x));
  }else{
    return _checkValue(value);
  }
}

function getDomainValue(state){
  if(!hasDomainValue(state)) return;

  const domainValue = state.get('domainValue').toJS();
  const first = domainValue[0];
  return _.isObject(first) && 'key' in first ? domainValue : _.map(domainValue, v => { return {key: v, value: v} });
}

function checkDomain(state, value){
  return _.contains(_.map(getDomainValue(state), ({key, value}) => key), value);
}

function hasDomainValue(state){
  return state.get('domainValue');
}

function mustCheckDomainValue(state){
  return state.get('checkDomainValue');
}

function isMultiValued(state){
  return state.get('multiValue');
}

function isRequired(state){
  return state.get('required');
}

function isNull(value){
  return _.isUndefined(value) || value === "";
}

function castedValue(state, value){
  if(isMultiValued(state)) return value.toJS ? value.toJS() : [];
  switch(state.get('type')){
    case 'number':
    case 'integer':
      return Number(value);
    case 'boolean':
      return Boolean(value);
    case 'text':
      if(value === '' || !value)return;
      return value.trim ? value.trim() : value;
    default: 
      return value;
  }
}

function getError(state, value){
  if(isNull(value) && isRequired(state)) return "Input required";
  if(state.get('pattern')) return "Value doesn't match pattern!"
  if(hasDomainValue(state)) return "Value doesn't match domain value!"
  switch(state.get('type')){
    case 'number':
      return "Value is not a number!";
    case 'integer':
      return "Value is not an integer!";
    case 'boolean':
      return "Value is not an boolean!";
  }
  return "Wrong value!";
}

function checkError(state, value){
  if(!checkValue(state, value)) return getError(state, value);
}

