import {MultiField, FieldGroup, Field, Formo} from '../';
import should from 'should';
import _ from 'lodash';

describe('MultiField', function(){
  const formo = () => {
    const f =  new Formo([
      new Field('name',{
        type: 'text',
        defaultValue: 'toto'
      }),
      new MultiField('phones', [
        new Field('number',{
          label: 'Number',
          type: 'integer',
          //defaultValue: '3333'
          //pattern: /^\+(?:[0-9] ?){6,14}[0-9]$/
        }),
        new Field('label',{
          label: 'Label',
          type: 'text',
        }),
      ])
    ]);
    const phones = f.field('/phones');
    phones.addField();
    phones.addField();
    return f;
  }

  const formo1 = () => {
    return new Formo([
      new Field('name',{
        type: 'text',
        defaultValue: 'toto'
      }),
      new MultiField('phones', [
        new Field('number',{
          label: 'Number',
          type: 'integer',
          //pattern: /^\+(?:[0-9] ?){6,14}[0-9]$/
        }),
        new Field('label',{
          label: 'Label',
          type: 'text',
        }),
      ])
    ], {
      name: 'titi',
      phones:[
        {label: 'home', number: 1},
        {label: 'work', number: 2},
      ]
    });
  }


  it('should get and set first field', (done) => {
    const number1 = formo().field('/phones/0/number');
    number1.state.skip(1).onValue( s => {
      const res = s.toJS();
      should(res.value).equal(42);
      done();
    });
    number1.setValue(42);
  });

  it('should be able to add a field', (done) => {
    const phones = formo().field('/phones');
    const phone3 = phones.addField();
    phone3.state.skip(2).onValue( s => {
      const res = phone3.toDocument(s);
      should(res.number).equal(44);
      done();
    });
    phone3.setValue('number', 44).setValue('label', 'Home')
  });

  it('should be able to delete a field', (done) => {
    const form = formo();
    const phones = form.field('/phones');
    const phone3 = phones.addField();
    phones.deleteField(phone3);
    form.onSubmit( (s, doc) => {
      should(doc.phones.length).equal(2);
      done();
    });
    form.submit();
  });
  
  it('should be able to delete an existing field', (done) => {
    const form = formo();
    const phones = form.field('/phones');
    const phone1 = formo().field('/phones/0');

    // must call onValue to activate streams!!!!
    form.onValue(() => {
    });
    phones.deleteField(phone1);
    form.onSubmit( (s, doc) => {
      should(doc.phones.length).equal(1);
      done();
    });
    form.submit();
  });

  it('should load document values', (done) => {
    const form = formo1();
    form.onSubmit( (s, doc) => {
      should(doc.phones[1].number).equal(2);
      done();
    });
    form.submit();
  });

  it('should be able to reset values', (done) => {
    const form = formo1();
    const phone = form.field('/phones/1');
    phone.setValue('number', '8888');
    form.onSubmit( (s, doc) => {
      should(doc.phones[1].number).equal(2);
      done();
    });
    form.reset();
    form.submit();
  });


});



