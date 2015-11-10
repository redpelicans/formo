## formo [![Build Status](https://travis-ci.org/redpelicans/formo.png)](https://travis-ci.org/redpelicans/formo)


A reactive helper and validator library for html forms

### Why formo, why another form library ?

I was working on a reactive site and had to craft htlm forms. Because it was very difficult to find a library able to correctly cover the event dimension of the problem, I decided to create one. Here is formo ...

### What is not formo

* it's not a form builder; formo is completely independent from the view framework. But it's first use is with React, so you can find many examples of react elements binding. 

* it's not a full validation library;  formo use its own validation code, may be in the furure it should be better to use an external lirary

### What is formo

* it's a fully reactive library, built on top of [Kefir](https://rpominov.github.io/kefir). Can be managed by pluging into streams or by sending imperative calls. Should be enought flexible to express complex form's behaviour.

* it uses schema validation (type, pattern, doman value, required field), but keep validation and schema management isolated from rendering

* it offers to define multi levels schema and bing form elements to any level of the schema* 

* it can submit field's value to a remote validation



That's all folks ....
