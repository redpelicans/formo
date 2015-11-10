## formo [![Build Status](https://travis-ci.org/redpelicans/formo.png)](https://travis-ci.org/redpelicans/formo)


A reactive helper and validator library for html forms

### Why formo, why another form library ?

I was working on a reactive site and had to craft htlm forms. Because it was very difficult to find a library able to correctly cover the event dimension of the problem, I decided to create one. Here is formo ...

### What is not formo

* it's not a form builder: formo is completely independent of the view layer. But it's first use is wihin a React app, so you can find many examples of react elements binding. 

* it's not a full validation library: formo uses its own validation code, may be in the furure it should be better to use an external lirary

### What is formo

* it's a fully reactive library, built on top of [Kefir](https://rpominov.github.io/kefir). it can be managed by pluging into streams or by sending imperative calls. Should be enought flexible to express complex form's behaviour.

* it uses schema validation (type, pattern, doman value, required field), but keep validation and schema management isolated from rendering

* it offers to define multi levels schema and to bind html form elements to any level of the schema* 

* it can submit field's value to a remote validation

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

Not very useful yet, so continu ...

### API

#### Field

A field is defined by a `schema` and a `name`:

`new Field(name, schema)`

* `name`: key to identify the field within a `formo` object. Later is a tree, so `name` should be a uniq for each tree's levels.
* `schema`: JS object:
  * `label`: used by client's library to display element name, it's a free attribute ot used yet by `formo`.
  * `type`: following types are managed ['text', 'number', 'interger', 'boolean'].
  * `pattern`: regext that `field.value` should match, if present will override `type`.
  * `defaultValue`: default value at initialisation and after a `reset` of the field.
  * `domainValue`: `Array` containing all possible values or `function` that take a value and returns `true` if value belongs to domain, if present will override `type` and `pattern`.
  * `valueChecker`: Object, if present, will override `type`, `pattern` and `domainValue`
    * `checker`: `function` that returns a `Promise` that should be resolved as `true` if value is correct
    * `debounce`: will call `checker` only milliseconds after last value received
    * `error`: error message to return if checker returns `false`


A field exports 4 `Kefir` streams. 3 of them are used to publish values or send commands, the last one `state` is to observe field's states.  

#### MultiField

#### Formo

That's all folks ....
