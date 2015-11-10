import {Field, Formo, MultiField} from '../';
import should from 'should';
import _ from 'lodash';

function checker(res){
  return function(price){
    const promise = new Promise( (resolve, reject) => {
      setTimeout( () => resolve(res), 20);
    });
    return promise;
  }
}

function f(document){
  return new Formo([
    new Field('price',{
      label: 'Price',
      type: 'number',
      defaultValue: 11,
    }),
    new MultiField( 'data', [
      new Field('label',{
        label: 'Label',
        type: 'text',
        defaultValue: 'toto',
      }),
    ]),
  ], document);
}

describe('formo', function(){

  describe('setValue', () => {
    it('should have a value', (done) => {
      const formo = f();
      const field = formo.field('price');
      formo.state.skip(1).onValue( s => {
        const res = s.toJS();
        should(res.price.value).equal(42);
        should(res.error).be.undefined;
        should(res.canSubmit).be.true();
        should(res.isLoading).be.false();
        should(res.hasBeenModified).be.true();
        done();
      });
      field.setValue(42);
    });
  });

  describe('reset', () => {
    it('should not have changed', (done) => {
      const formo = f();
      const field = formo.field('price');
      formo.submitted.onValue( s => {
        const res = s.toJS();
        should(res.price.value).equal(11);
        should(res.canSubmit).be.true();
        should(res.isLoading).be.false();
        should(res.hasBeenModified).be.false();
        done();
      });
      field.setValue(42);
      formo.reset();
      formo.submit();
    });
  });

  describe('canSubmit', () => {
    it('should not be able to submit', (done) => {
      const formo = f();
      const field = formo.field('price');
      formo.submitted.onValue( s => {
        const res = s.toJS();
        should(res.price.value).equal('toto');
        should(res.price.error).be.a.String();
        should(res.canSubmit).be.false();
        should(res.isLoading).be.false();
        should(res.hasBeenModified).be.true();
        done();
      });
      field.setValue('toto');
      formo.submit();
    });
  });

  describe('to document', () => {
    it('should get right plain JS object', (done) => {
      const formo = f();
      const price = formo.field('price');
      const label = formo.field('/data/label');
      formo.submitted.onValue( state => {
        const res = formo.toDocument(state);
        should(res.price).equal(67);
        should(res.data.label).equal('redpelicans');
        done();
      });
      price.setValue(67);
      label.setValue('redpelicans');
      formo.submit();
    });
  });

  describe('bind a document', () => {
    it('should get right plain JS object', (done) => {
      const formo = f({price: 77, data: {label: 'ici'}});
      const price = formo.field('price');
      const label = formo.field('/data/label');
      formo.submitted.onValue( state => {
        const stateJS = state.toJS();
        const res = formo.toDocument(state);
        should(res.price).equal(77);
        should(res.data.label).equal('ici');
        should(stateJS.hasBeenModified).be.false();
        should(stateJS.canSubmit).be.true();
        done();
      });
      price.setValue(67);
      label.setValue('redpelicans');
      formo.reset();
      formo.submit();
    });

    it('should not be able to submit', (done) => {
      const formo = f({price: 'camembert', data: {label: 'ici'}});
      const price = formo.field('price');
      const label = formo.field('/data/label');
      formo.submitted.onValue( state => {
        const stateJS = state.toJS();
        const res = formo.toDocument(state);
        should(res.price).be.eql(NaN);
        should(res.data.label).equal('redpelicans');
        should(stateJS.price.error).be.a.String();
        should(stateJS.hasBeenModified).be.true();
        should(stateJS.canSubmit).be.false();
        done();
      });
      label.setValue('redpelicans');
      formo.submit();
    });

  });


});
