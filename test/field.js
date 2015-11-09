import {Field} from '../';
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


describe('fields', function(){

  describe('setValue', () => {
    it('should have a value', (done) => {
      const field = new Field('price', { label: 'Price', type: 'text' });
      field.initState();
      field.state.skip(1).onValue( s => {
        should(s.toJS().value).equal('42');
        done();
      });
      field.setValue('42');
    });
    it('should have a default value', (done) => {
      const field = new Field('price', { label: 'Price', type: 'integer', defaultValue: 43 });
      field.initState();
      field.state.onValue( s => {
        should(s.toJS().value).equal(43);
        done();
      });
    });
    it('should be reset', (done) => {
      const field = new Field('price', { label: 'Price', type: 'integer', defaultValue: 43 });
      field.initState();
      field.state.skip(2).onValue( s => {
        should(s.toJS().value).equal(43);
        done();
      });
      field.setValue(42);
      field.reset();
    });
  });

  describe('checkValue', () => {
    it('should not be an integer', (done) => {
      const field = new Field('price', { label: 'Price', type: 'integer' });
      field.initState();
      field.state.skip(1).onValue( s => {
        should(s.get('error')).be.a.String();
        done();
      });
      field.setValue(42.42);
    });

    it('should be an integer', (done) => {
      const field = new Field('price', { label: 'Price', type: 'integer' });
      field.initState();
      field.state.skip(1).onValue( s => {
        should(s.get('error')).be.undefined();
        done();
      });
      field.setValue(42);
    });


    it('should not be a number', (done) => {
      const field = new Field('price', { label: 'Price', type: 'number' });
      field.initState();
      field.state.skip(1).onValue( s => {
        should(s.get('error')).be.a.String();
        done();
      });
      field.setValue('camembert');
    });

    it('should be a number', (done) => {
      const field = new Field('price', { label: 'Price', type: 'number' });
      field.initState();
      field.state.skip(1).onValue( s => {
        should(s.get('error')).be.undefined();
        done();
      });
      field.setValue(42.42);
    });

    it('should not be boolean', (done) => {
      const field = new Field('price', { label: 'Price', type: 'boolean', defaultValue: 'toto' });
      field.initState();
      field.state.onValue( s => {
        should(s.get('error')).be.a.String();
        done();
      });
    });

    it('should be boolean', (done) => {
      const field = new Field('price', { label: 'Price', type: 'boolean', defaultValue:false });
      field.initState();
      field.state.onValue( s => {
        should(s.get('error')).be.undefined();
        done();
      });
    });

    it('should be a string', (done) => {
      const field = new Field('price', { label: 'Price', defaultValue: 'toto' });
      field.initState();
      field.state.onValue( s => {
        should(s.get('error')).be.undefined();
        done();
      });
    });

    it('should be a string but do not match pattern', (done) => {
      const field = new Field('price', { label: 'Price', pattern: /$titi/, defaultValue:'toto' });
      field.initState();
      field.state.onValue( s => {
        should(s.get('error')).not.be.undefined();
        done();
      });
    });


    it('should not match a pattern', (done) => {
      const field = new Field('price', { label: 'Price', pattern: /[1,2,3]/, defaultValue:'abc' });
      field.initState();
      field.state.onValue( s => {
        should(s.get('error')).be.a.String();
        done();
      });
    });

    it('should match a pattern', (done) => {
      const field = new Field('price', { label: 'Price', pattern: /[1,2,3]/, defaultValue:'2' });
      field.initState();
      field.state.onValue( s => {
        should(s.get('error')).be.undefined();
        done();
      });
    });
  });

  describe('hasBeenModified', () => {
    it('should have been modified', (done) => {
      const field = new Field('price', { label: 'Price', type: 'text', defaultValue: 'toto' });
      field.initState();
      field.state.skip(1).onValue( s => {
        should(s.toJS().hasBeenModified).be.true();
        done();
      });
      field.setValue('titi');
    });

    it('should not have been modified', (done) => {
      const field = new Field('price', { label: 'Price', type: 'text', defaultValue: 'toto' });
      field.initState();
      field.state.onValue( s => {
        should(s.toJS().hasBeenModified).be.false();
        done();
      });
    });

    it('should not have been modified after reset', (done) => {
      const field = new Field('price', { label: 'Price', type: 'text', defaultValue: 'toto' });
      field.initState();
      field.state.skip(2).onValue( s => {
        should(s.toJS().hasBeenModified).be.false();
        done();
      });
      field.setValue('titi');
      field.reset();
    });
  });

  describe('canSubmit', () => {
    it('should be able to submit', (done) => {
      const field = new Field('price', { label: 'Price', type: 'integer', defaultValue: 12 });
      field.initState();
      field.state.skip(1).onValue( s => {
        should(s.toJS().canSubmit).be.true();
        done();
      });
      field.setValue(12);
    });

    it('should not be able to submit', (done) => {
      const field = new Field('price', { label: 'Price', type: 'integer', defaultValue: 'toto' });
      field.initState();
      field.state.onValue( s => {
        should(s.toJS().canSubmit).be.false();
        done();
      });
    });
  });

  describe('isRequired', () => {
    it('should not be able to submit', (done) => {
      const field = new Field('price', { label: 'Price', type: 'integer', required: true});
      field.initState();
      field.state.skip(0).onValue( s => {
        should(s.toJS().canSubmit).be.false();
        done();
      });
    });

    it('should be able to submit', (done) => {
      const field = new Field('price', { label: 'Price', type: 'integer', required: false });
      field.initState();
      field.state.skip(0).onValue( s => {
        should(s.toJS().canSubmit).be.true();
        done();
      });
    });
  });

  describe('remote value checker', () => {
    it('should be able to submit', (done) => {
      const field = new Field('price', { 
        label: 'Price', 
        defaultValue: 1,
        valueChecker: { 
          checker: checker(true), 
          debounce: 2, 
        },
      });

      field.initState();
      field.state.skip(3).onValue( s => {
        const res = s.toJS();
        should(res.value).equal(42);
        should(res.error).be.undefined();
        should(res.canSubmit).be.true();
        should(res.isLoading).equal(0);
        done();
      });
      field.setValue(42);
    });

    it('should not be able to submit', (done) => {
      const error = 'Wrong price!';
      const field = new Field('price', { 
        label: 'Price', 
        valueChecker: { 
          checker: checker(false), 
          debounce: 10, 
          error: error
        },
      });

      field.initState();
      field.state.skip(3).onValue( s => {
        const res = s.toJS();
        should(res.value).equal(42);
        should(res.error).be.equal(error);
        should(res.canSubmit).be.false();
        should(res.isLoading).equal(0);
        done();
      });
      field.setValue(42);
    });

    it('should be loading', (done) => {
      const field = new Field('price', { 
        label: 'Price', 
        valueChecker: { 
          checker: checker(false), 
          debounce: 10, 
        },
      });

      field.initState();
      field.state.skip(2).onValue( s => {
        const res = s.toJS();
        should(res.isLoading).equal(1);
        done();
      });
      field.setValue(42);
    });

  });

});
