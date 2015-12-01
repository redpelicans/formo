import {Field, Formo} from '../';
import should from 'should';
import _ from 'lodash';

describe('multifields', function(){

    it('should not match a pattern', (done) => {
      const formo = new Formo([new Field('price', { multiValue: true, pattern: /[1,2,3]/, defaultValue:['abc'] })]);
      const field = formo.field('price');
      field.state.onValue( s => {
        const res = s.toJS();
        should(res.error).be.a.String();
        done();
      });
    });

    it('should match a pattern', (done) => {
      const formo = new Formo([new Field('price', { multiValue: true, pattern: /[1,2,3]/ })]);
      const field = formo.field('price');
      field.state.skip(1).onValue( s => {
        const res = s.toJS();
        should(res.error).be.undefined();
        done();
      });
      field.setValue([1, 2, 2]);
    });

    it('should not match a domain value', (done) => {
      const formo = new Formo([new Field('price', { multiValue: true, domainValue: [1,2,3], defaultValue:[1, 2, 1, 4] })]);
      const field = formo.field('price');
      field.state.onValue( s => {
        const res = s.toJS();
        should(res.error).be.a.String();
        done();
      });
    });

    it('should match a domain value', (done) => {
      const formo = new Formo([new Field('price', { multiValue: true, domainValue: [1,2,3]})]);
      const field = formo.field('price');
      field.state.skip(1).onValue( s => {
        const res = s.toJS();
        should(res.error).be.undefined();
        done();
      });
      field.setValue([1, 2, 2]);
    });

    it('should get right plain JS object', (done) => {
      const formo = new Formo([new Field('price', { multiValue: true, domainValue: [1,2,3]})]);
      const price = formo.field('price');
      formo.onSubmit( (state, doc) => {
        should(doc.price).eql([1,1,1,1]);
        done();
      });
      price.setValue([1,1,1,1]);
      formo.submit();
    });
 
});

describe('dynamic domain value', () => {
  it('should not match domain value', (done) => {
    const formo = new Formo([new Field('price', {multiValue: true})]);
    const field = formo.field('price');
    field.state.skip(2).onValue( s => {
      const res = s.toJS();
      should(res.value).eql([4, 2]);
      should(res.error).be.a.String();
      done();
    });
    field.setSchemaValue('domainValue',  [4]);
    field.setValue([4, 2]);
  });

  it('should match domain value', (done) => {
    const formo = new Formo([new Field('price', {multiValue: true})]);
    const field = formo.field('price');
    field.state.skip(2).onValue( s => {
      const res = s.toJS();
      should(res.error).be.undefined();
      should(res.value).eql([42, 42]);
      done();
    });
    field.setSchemaValue('domainValue',  [42]);
    field.setValue([42, 42]);
  });

});


