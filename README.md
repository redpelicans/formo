## formo [![Build Status](https://travis-ci.org/redpelicans/formo.png)](https://travis-ci.org/redpelicans/formo)


A reactive helper and validator library for html forms

### Why formo, why another form library ?

I was working on a reactive app and had to craft htlm forms. Because it was very difficult to find a library able to correctly cover the event dimension of the problem, I decided to create one. Here is formo ...

### What is not formo

* it's not a form builder: formo is completely independent of the view layer. But it's first use is wihin a React app, so you can find many examples of react elements binding. 

* it's not a full validation library: formo uses its own validation code, may be in the furure it should be better to use an external lirary

### What is formo

* it's a fully reactive library, built on top of [Kefir](https://rpominov.github.io/kefir). it can be managed by pluging into streams or by sending imperative calls. Should be enought flexible to express complex form's behaviour.

* it uses schema validation (type, pattern, doman value, required field), but keep validation and schema management isolated from rendering

* it offers to define multi levels schema and to bind html form elements to any level of the schema 

* it can submit field's values to remote validations

### How to install formo

As usual: `$ npm install formo`


### How to use

A `Formo` object is mainly a tree made of reactive `Fields` associated with their own schema validation. We can observe field states and publish values to them.

#### Let's use our first schema:

```
import {Field, Formo} from 'formo';

const formo = new Formo([
  new Field('price', {
    label: 'Amount',
    type: 'number',
    defaultValue: 40
  })
])
```

We would like to define an html element to render prices:

```
const price = formo.field('price');
```

We can observe this field:

```
price.onValue( state => {
  const priceState = state.toJS();
  console.log(priceState.value);
})
```

Let's set multipe prices:

```
price.setValue(42);
price.setValue(42.5);
price.setValue(43);
```

Or event better, `formo` use [Kefir](https://rpominov.github.io/kefir), so we can do:

```
import Kefir from 'kefir';
price.newValueStream.plug(Kefir.sequentially(10, [42, 42.5, 43]));
```

Console we will display: 40 42 42.5 43

Not very useful yet, so continue ...

### API

#### Field

A field is defined by a `schema` and a `name`:

`new Field(name, schema)`

* `name`: key to identify the field within a `formo` object. Later is a tree, so `name` should be a uniq for each tree's levels.
* `schema`: JS object:
  * `label`: used by client's library to display element name, it's a free attribute ot used yet by `formo`.
  * `type`: following types are managed ['text', 'number', 'interger', 'boolean'].
  * `required`: field is required
  * `pattern`: regext that `field.value` should match, if present will override `type`.
  * `defaultValue`: default value at initialisation and after a `reset` of the field.
  * `domainValue`: `Array` containing all possible values or `function` that take a value and returns `true` if value belongs to domain, if present will override `type` and `pattern`.
  * `valueChecker`: Object, if present, will override `type`, `pattern` and `domainValue`
    * `checker`: `function` that returns a `Promise` that should be resolved as `true` if value is correct
    * `debounce`: will call `checker` only milliseconds after last value received


A field exports 3 `Kefir` streams as inputs:

* `newValueStream`: used to publish new values
* `resetStream`: used to reset field's state
* `activateStream`: used to active/desactive a field

We can call 3 asynchronous methods instead of using stream:

* `Field#setValue(value)`: push a new value to the field
* `Field#reset(data)`: reset the field, data will be accessible as `resetOptions` in resulting `state`
* `Field#activate(boolean)`: will set up `isActivate` attribute in the state

A field has no value, it's a reactive structure, if you observe it, you can get one!

* `Field.state` is a Kefir property, so to get its value we need to observe it with `Field.state.onValue`:

```
  const price = formo.field('price'):
  price.state.onValue( price => {
    this.setState({price: price});
  });
```

* Field.onValue(function(fieldState))`: `fieldState` is an (Immutable](http://facebook.github.io/immutable-js) Map object with those keys:
 * `value`: field value, even if validation failed, a new state with this value will be published.
 * `error`: error string if `value` validation failed. Each time a field receive a value and at initialisation, field will check its value (see `schema` above)
 * `isActivated`: boolean 
 * `hasBeenModified`: boolean to reflect if field's value changed
 * `canSubmit`: boolean to indicate if value is checked and no processing is in progress
 * `isLoading`: counter of running requests to check values (see `valueChecker`)


Let's play:

```
function priceChecker(value){
  return new Promise( (resolve, reject) => {
    setTimeout( () => resolve({checked: value <= 42, error: 'server error'}), 20);
  });
}

const formo = new Formo([
  new Field('price', {
    defaultValue: 42,
    required: true,
    valueChecker:{
      checker: priceChecker,
      debounce: 20;
    }
  })
])

const price = formo.field('price');
price.state.onValue( state => {
  console.log(state.toJS())
});

price.newValueStream.plug(Kefir.sequentially(100, [undefined, 'toto', 40]));
```

We use `Kefir.sequentially` instead of `price.setValue` to be more realistic: remember that we will do server side value checking with a `debounce` value.

Will output:

```
// 1
{ value: 42,
  canSubmit: true,
  hasBeenModified: false }
// 2
{ value: undefined,
  canSubmit: false,
  hasBeenModified: true }
// 3
{ value: 'toto',
  canSubmit: false,
  hasBeenModified: true }
// 4
{ value: 'toto',
  canSubmit: false,
  isLoading: 1,
  hasBeenModified: true }
// 5
{ value: 'toto',
  error: 'server error',
  canSubmit: false,
  hasBeenModified: true }
//6
{ value: 40,
  canSubmit: false,
  hasBeenModified: true }
// 7
{ value: 40,
  canSubmit: false,
  isLoading: 1,
  hasBeenModified: true }
// 8
{ value: 40,
  canSubmit: true,
  hasBeenModified: true }
```

Output explanations:

1.  default value, `valueChecker` is not called for default value => we can submit
2.  `undefined` value is rejected because field is required
3.  `'toto'` value is new yet checked server side, so we cannot submit before receiving answer from server
4.  server side checking was requested
5.  server refuse value
6.
7.
8.  same workflow, but now value is accepted by server


#### Formo

A `formo` object is a tree made of `Fields`. To create one, we need to give it fields organized as a tree:

```
const formo = new Formo([
  new Field('price', {
    defaultValue: 42,
    required: true,
    type: 'number'
  }),
  new Field('currency', {
    defaultValue: 'EUR',
    required: true,
    domainValue: ['EUR', 'USD', 'GBP'}
  })
])
```

A `formo` object will be used to generate a javascript object but also to update an existing one:

```
const formo = new Formo([
  new Field('price', {
    defaultValue: 42,
    required: true,
    type: 'number'
  }),
  new Field('currency', {
    defaultValue: 'EUR',
    required: true,
    domainValue: ['EUR', 'USD', 'GBP'}
  })
], {
  price: 54,
  currency: 'GBP'
})

const price = formo.field('price');
price.state.onValue( state => {
  console.log(state.toJS().value)
});

```
Will output 54: default values are overwritten by actual values.

* `Formo#field(path)`: One fields are created as a `Formo` object, this method helps to get them. It uses a `path` and not just a name, because we are playing with a tree (see MultiField).

```
const formo = new Formo([
  new MultiField('bill', [
    new Field('price', {type: 'number'}),
    new Field('currency', {defaultValue: 'EUR',domainValue: ['EUR', 'USD', 'GBP'}
    }),
  ])
]

const field = formo.field('/bill/currency');
```

We can `submit`, `cancel`, `reset`, `activate` a `formo` object thanks to those methods and associated streams:

* `Formo#reset()`: reset all fields, will call `Field#reset()` on all fields
* `Formo#activate(boolean)`: will call `Field#activate(boolean) on all fields
* `Formo#submit()` | `Formo#submitStream`: used to uncouple component who emits `submit` event from the one who will process it. Latter has to observe the stream `Formo#submitted` (see below)
* `Formo#cancel()` | `Formo#cancelStream`: same idea as for `submit`

`reset()` and `activate()` will update field's states, so that `Formo#state.onValue(state)` will be called for each of them:

```
const formo = new Formo([new Field('price', {defaultValue: 42})});
formo.state.onValue( state => {
  console.log(state.getIn(['price', 'value']));
});
formo.field('price').setValue(44);
formo.reset();
```

Will output : 42, 44, 42

`Formo#cancel()` and `Formo#submit()` will not change field's states, we have to observe respectively `Formo#cancelled` and `Formo#submitted` streams to react:

```
const formo = new Formo();
formo.submitted.onValue( state => {
  console.log(state);
});
formo.submit();
```

Will output: `Map { "canSubmit": true, "hasBeenModified": false, "isLoading": false}`

After a `submit` event it's very common to need the aquivalent of the `Formo` object as a plain old javascript object, `Formo#toDocument()` wil help:

* `Formo#toDocument(state)`: convert a `Formo` object state to a javasctip object:

```
const formo = new Formo([new MultiField('bike', [new Field('price')])]);
const [bike, price] = [formo.field('bike'), formo.field('/bike/price')];

formo.submitted.onValue( state => {
  console.log(state);
});
price.setValue(142)
formo.submit();
```
Will output: `{ bike: { price: 142 } }`


A `Formo` object is an observable. Returned `state` is an agregation of all children's states. In a `Formo` tree you can observe at any levels :

```
const formo = new Formo([new MultiField('bike', [new Field('price')])]);
const [bike, price] = [formo.field('bike'), formo.field('/bike/price')];

formo.state.onValue(state => console.log(state.toJS().bike.price.value));
bike.state.onValue(state => console.log(state.toJS().price.value));
price.state.onValue(state => console.log(state.toJS().value));

price.setValue(142);
```

Will output: `142 142 142`


#### MultiField

A `Multifield` is made of `Multifields` or `Fields` in a `Formo` tree. If you think world is not flat, use it!

A `MultiField` has no value, but you can `reset`, `activate` them.

A `MultiField` is an observable, like a `Formo` object (see above).

* `MultiField#state.onValue(fieldState)` gives you an agregation of children's states. 

```
const formo = new Formo([new MultiField('bike', [new Field('price')])]);
const [bike, price] = [formo.field('bike'), formo.field('/bike/price')];

bike.state.onValue(state => console.log(state.toJS()));
price.setValue(142);
```

Will output:

```
{ canSubmit: true,
  hasBeenModified: false,
  isLoading: false,
  price: 
   { value: undefined,
     canSubmit: true,
     hasBeenModified: false } }
{ canSubmit: true,
  hasBeenModified: true,
  isLoading: false,
  price: 
   { value: 142,
     canSubmit: true,
     hasBeenModified: true } }
```


That's all folks ....
