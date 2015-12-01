## Formo [![Build Status](https://travis-ci.org/redpelicans/formo.png)](https://travis-ci.org/redpelicans/formo)

A reactive helper and validator library for html forms.  
Check out the online [React demo](http://redpelicans.github.io/formo-react-sample/).

### Why formo, why another form library?

While working on a reactive app, I had to craft html forms. Finding a library able to correctly cover the event dimension of the problem was very difficult, so I decided to create a new one: **formo**.

### What formo is not.

* it's not a form builder: formo is completely independent of the view layer. Since it's very first use is within a React app, you'll find many examples of React elements binding. 
* it's not a full validation library: formo relies on its own validation code, it may be better to use an external lirary in the future.

### What is formo?

* it's a fully reactive library, built on top of [Kefir](https://rpominov.github.io/kefir). It can be managed through streams or with imperative calls. It should be flexible enough to express complex form's behaviour.
* it uses schema validation (type, pattern, domain value, required field) but keep validation and schema management isolated from rendering
* it provides multi-levels schema definition and html form elements bindings at any level of the schema
* it can submit field's values to remote validations

### How to install formo

As usual: `$ npm install formo`

### How to use it

A `Formo` object is mainly a reactive data structure, made of `Fields` associated with their own schema.  
We can push events and values to fields observe them.

**Let's define our first schema:**
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

**We want to manipulate prices:**
```
const price = formo.field('price');
```

**We are now able to observe prices and render them:**
```
price.onValue(state => {
  console.log(state.value);
});
```

**Let's set multiple prices:**
```
price.setValue(42);
price.setValue(42.5);
price.setValue(43);
```

**Or even better, `formo` use [Kefir](https://rpominov.github.io/kefir), so we can do:**
```
import Kefir from 'kefir';
price.newValueStream.plug(Kefir.sequentially(10, [42, 42.5, 43]));
```

> Will output: `40 42 42.5 43`

So far, nothing very usefyl... yet.
Read the API to really see the awesomeness of form!

### API

#### Field

A field is defined by a `schema` and a `name`: `new Field(name, schema)`
* `name` _String_: key to identify the field within a `formo` object. A `formo` object is a tree, so `name` have to be a uniq for each levels of the tree
* `schema` _Object_:
  * `label`: used by client's library to display element name, it's a free attribute not used yet by `formo`
  * `type`: following types are managed ['text', 'number', 'interger', 'boolean']
  * `required`: field is required
  * `pattern`: regext that `field.value` should match, if present will override `type`
  * `defaultValue`: default value at initialisation and after a `reset` of the field
  * `domainValue`: `Array` containing all values or key/value object. If present will override `type` and `pattern`
  * `multiValue`: value will be an Array, individual values will be checked
  * `checkDomainValue`: boolean whether or not to check field's value within it's domain value
  * `valueChecker`: Object, if present, will override `type`, `pattern` and `domainValue`. 
    * `checker`: `function` that takes a value and current document if exists and returns a `Promise` that should be resolved as `true` if value is correct
    * `debounce`: will call `checker` only milliseconds after last value received

All above schema's attributes are directly accessible from a field. If you add extra attributes, you can access them via `field.schema.<attribute>`.


A field exports 3 `Kefir` streams as inputs:

* `newValueStream`: used to publish new values
* `newValueschemaStream`: used to publish new schema's values
* `resetStream`: used to reset field's state
* `disabledStream`: used to active/desactive a field

We can call 3 asynchronous methods instead of using stream:

* `Field#setValue(value)`: push a new value to the field
* `Field#setSchemaValue(value)`: push a new schema's value to the state
* `Field#reset(data)`: reset the field, data will be accessible as `resetOptions` in resulting `state`
* `Field#disabled(boolean)`: will set up `isActivate` attribute in the state

A field has no value, it's a reactive structure, you need to observe it:


```
  const price = formo.field('price'):
  price.onValue( price => {
    this.setState({price: price});
  });
```

* Field.onValue(function(fieldState))`: `fieldState` is a Javascript object with those keys:

 * `value`: field value, even if validation failed, a new state with this value will be published.
 * `error`: error string if `value` validation failed. Each time a field receive a value and at initialisation, field will check its value (see `schema` above)
 * `disabled`: boolean 
 * `hasBeenModified`: boolean to reflect if field's value changed
 * `canSubmit`: boolean to indicate if value is checked and no processing is in progress
 * `isLoading`: counter of running requests to check values (see `valueChecker`)

* `Field.state` is a Kefir property, you can call `onValue` and get the internal immutable state.

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
price.onValue( state => {
  console.log(state)
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
price.onValue( state => {
  console.log(state.value)
});

```
Will output 54: default values are overwritten by actual values.

* `Formo#field(path)`: One fields are created as a `Formo` object, this method helps to get them. It uses a `path` and not just a name, because we are playing with a tree (see FieldGroup).

```
const formo = new Formo([
  new FieldGroup('bill', [
    new Field('price', {type: 'number'}),
    new Field('currency', {defaultValue: 'EUR',domainValue: ['EUR', 'USD', 'GBP'}
    }),
  ])
]

const field = formo.field('/bill/currency');
```

We can `submit`, `cancel`, `reset`, `activate` a `formo` object thanks to those methods and associated streams:

* `Formo#reset()`: reset all fields, will call `Field#reset()` on all fields
* `Formo#disabled(boolean)`: will call `Field#disabled(boolean) on all fields
* `Formo#submit()` | `Formo#submitStream`: used to uncouple component who emits `submit` event from the one who will process it. Latter has to observe the stream `Formo#submitted` (see below)
* `Formo#cancel()` | `Formo#cancelStream`: same idea as for `submit`

`reset()` and `activate()` will update field's states, so that `Formo#onValue(state)` will be called for each of them:

```
const formo = new Formo([new Field('price', {defaultValue: 42})});
formo.onValue( state => {
  console.log(state.price.value);
});
formo.field('price').setValue(44);
formo.reset();
```

Will output : 42, 44, 42

`Formo#cancel()` and `Formo#submit()` will not change field's states, we have to observe respectively `Formo#cancelled` and `Formo#submitted` streams  or register to `Formo.onSubmit` or `formo.onCancel` to react:

```
const formo = new Formo();
formo.onSubmit( (state, document) => {
  console.log(state);
});
formo.submit();
```

Will output: `Map { "canSubmit": true, "hasBeenModified": false, "isLoading": false}`


```
const formo = new Formo([new FieldGroup('bike', [new Field('price')])]);
const [bike, price] = [formo.field('bike'), formo.field('/bike/price')];

formo.onSubmit( (state, document) => {
  console.log(document);
});
price.setValue(142)
formo.submit();
```
Will output: `{ bike: { price: 142 } }`


A `Formo` object is an observable. Returned `state` is an agregation of all children's states. In a `Formo` tree you can observe at any levels :


```
const formo = new Formo([new FieldGroup('bike', [new Field('price')])]);
const [bike, price] = [formo.field('bike'), formo.field('/bike/price')];

formo.onValue(state => console.log(state.bike.price.value));
bike.onValue(state => console.log(state.price.value));
price.onValue(state => console.log(state.value));

price.setValue(142);
```

Will output: `142 142 142`

Same as for a `Field` you can access Kefir property `Formo.state`.


#### FieldGroup

A `FieldGroup` is made of `FieldGroup` or `Field` in a `Formo` tree. If you think world is not flat, use it!

A `FieldGroup` has no value, but you can `reset`, `disabled` them.

A `FieldGroup` is an observable, like a `Formo` object (see above).

* `FieldGroup#onValue(fieldState)` gives you an agregation of children's states. 

```
const formo = new Formo([
  new FieldGroup('bike', [
    new Field('price')
    ])
  ]);
const [bike, price] = [formo.field('bike'), formo.field('/bike/price')];

bike.onValue(state => console.log(state));
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
