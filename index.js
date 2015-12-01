'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Field = exports.FieldGroup = exports.Formo = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _kefir = require('kefir');

var _kefir2 = _interopRequireDefault(_kefir);

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AbstractFieldGroup = (function () {
  function AbstractFieldGroup(fields, name) {
    _classCallCheck(this, AbstractFieldGroup);

    this.key = name;
    this.fields = {};
    this.initFields(fields);
  }

  _createClass(AbstractFieldGroup, [{
    key: 'reset',
    value: function reset() {
      _lodash2.default.each(this.fields, function (field) {
        return field.reset();
      });
    }
  }, {
    key: 'disabled',
    value: function disabled(value) {
      _lodash2.default.each(this.fields, function (field) {
        return field.disabled(value);
      });
    }
  }, {
    key: 'hasBeenModified',
    value: function hasBeenModified(state) {
      var _this = this;

      return _lodash2.default.any(state, function (subState, name) {
        var field = _this.field(name);
        if (field && field.hasBeenModified) return field.hasBeenModified(subState);else return false;
      });
    }
  }, {
    key: 'field',
    value: function field(path) {
      return _lodash2.default.inject(path.split('/').filter(function (x) {
        return x != '';
      }), function (o, p) {
        return o && o.fields[p];
      }, this);
    }
  }, {
    key: 'initFields',
    value: function initFields(fields) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = fields[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var field = _step.value;

          this.fields[field.key] = field;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: 'combineStates',
    value: function combineStates() {
      var _this2 = this;

      var commands = _kefir2.default.pool();
      var fields = this.fields;
      var defaultState = _immutable2.default.Map({
        canSubmit: true,
        hasBeenModified: false,
        isLoading: false
      });

      var mergeChildrenState = function mergeChildrenState(field, state) {
        return function (parentState) {
          var newParentState = parentState.set(field.key, state);
          var subStates = newParentState.filter(function (subState) {
            return _immutable2.default.Map.isMap(subState) && subState.has('canSubmit');
          }).toList();
          var canSubmit = _lodash2.default.all(subStates.map(function (x) {
            return x.get('canSubmit');
          }).toJS());
          var isLoading = _lodash2.default.some(subStates.map(function (x) {
            return x.get('isLoading');
          }).toJS());
          var hasBeenModified = _lodash2.default.some(subStates.map(function (x) {
            return x.get('hasBeenModified');
          }).toJS());
          return newParentState.merge({
            canSubmit: canSubmit,
            hasBeenModified: hasBeenModified,
            isLoading: isLoading
          });
        };
      };

      _lodash2.default.each(fields, function (field) {
        commands.plug(field.state.map(function (state) {
          return mergeChildrenState(field, state);
        }));
      });

      if (this.markStream) {
        (function () {
          var markCommand = function markCommand(value) {
            return function (state) {
              return state.set('mark', value);
            };
          };
          commands.plug(_this2.markStream.map(function (v) {
            return markCommand(v);
          }));
        })();
      }

      return commands.scan(function (state, command) {
        return command(state);
      }, defaultState);
    }
  }, {
    key: 'initState',
    value: function initState() {
      _lodash2.default.each(this.fields, function (field) {
        field.initState();
      });
      this.state = this.combineStates();
    }
  }, {
    key: 'onValue',
    value: function onValue(cb) {
      var _this3 = this;

      var fct = undefined;
      this.state.onValue(fct = function (state) {
        return cb(state.toJS());
      });
      return function () {
        return _this3.state.offValue(fct);
      };
    }
  }, {
    key: 'path',
    get: function get() {
      if (!this.parent) return '';
      return this.parent.path + '/' + this.key;
    }
  }, {
    key: 'root',
    get: function get() {
      if (!this.parent) return this;
      return this.parent.root;
    }
  }]);

  return AbstractFieldGroup;
})();

var Formo = exports.Formo = (function (_AbstractFieldGroup) {
  _inherits(Formo, _AbstractFieldGroup);

  function Formo() {
    var fields = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
    var document = arguments[1];

    _classCallCheck(this, Formo);

    var _this4 = _possibleConstructorReturn(this, Object.getPrototypeOf(Formo).call(this, fields));

    _this4.propagateParent();
    _this4.document = document;

    _this4.markStream = _kefir2.default.pool();
    _this4.initState();

    _this4.submitStream = _kefir2.default.pool();
    _this4.submitted = _this4.state.sampledBy(_this4.submitStream, function (state, options) {
      return state.set('submitOptions', options);
    });

    _this4.cancelStream = _kefir2.default.pool();
    _this4.cancelled = _this4.state.sampledBy(_this4.cancelStream, function (state, options) {
      return state.set('cancelOptions', options);
    });
    return _this4;
  }

  _createClass(Formo, [{
    key: 'propagateParent',
    value: function propagateParent() {
      function propagate(parent) {
        if (!parent.fields) return;
        _lodash2.default.each(parent.fields, function (field) {
          field.parent = parent;
          propagate(field);
        });
      }
      propagate(this);
    }
  }, {
    key: 'onSubmit',
    value: function onSubmit(cb) {
      var _this5 = this;

      var fct = undefined;
      this.submitted.onValue(fct = function (state) {
        return cb(state.toJS(), _this5.toDocument(state));
      });
      return function () {
        return _this5.submitted.offValue(fct);
      };
    }
  }, {
    key: 'onCancel',
    value: function onCancel(cb) {
      var _this6 = this;

      var fct = undefined;
      this.cancelled.onValue(fct = function (state) {
        return cb(state.toJS());
      });
      return function () {
        return _this6.cancelled.offValue(fct);
      };
    }
  }, {
    key: 'submit',
    value: function submit(options) {
      this.submitStream.plug(_kefir2.default.constant(_immutable2.default.fromJS(options)));
    }
  }, {
    key: 'cancel',
    value: function cancel(options) {
      this.cancelStream.plug(_kefir2.default.constant(_immutable2.default.fromJS(options)));
    }
  }, {
    key: 'mark',
    value: function mark(value) {
      this.markStream.plug(_kefir2.default.constant(value));
    }
  }, {
    key: 'getDocumentValue',
    value: function getDocumentValue(path) {
      if (!this.document) return;
      return _lodash2.default.inject(path.split('/').filter(function (x) {
        return x !== '';
      }), function (d, p) {
        return d && d[p];
      }, this.document);
    }
  }, {
    key: 'toDocument',
    value: function toDocument(state) {
      var res = {};
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = state.entries()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _step2$value = _slicedToArray(_step2.value, 2);

          var name = _step2$value[0];
          var subState = _step2$value[1];

          if (_immutable2.default.Map.isMap(subState)) {
            if (subState.has('value')) res[name] = castedValue(subState, subState.get('value'));else res[name] = this.toDocument(subState);
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return res;
    }
  }]);

  return Formo;
})(AbstractFieldGroup);

var FieldGroup = exports.FieldGroup = (function (_AbstractFieldGroup2) {
  _inherits(FieldGroup, _AbstractFieldGroup2);

  function FieldGroup(name, fields) {
    _classCallCheck(this, FieldGroup);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(FieldGroup).call(this, fields, name));
  }

  return FieldGroup;
})(AbstractFieldGroup);

var Field = exports.Field = (function () {
  function Field(name) {
    var schema = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Field);

    this.schema = schema;
    this.key = name;
  }

  _createClass(Field, [{
    key: 'initState',
    value: function initState() {
      var _this8 = this;

      var defaultValue = this.defaultValue;

      var defaultState = _immutable2.default.fromJS({
        value: defaultValue,
        path: this.path,
        isLoading: 0,
        disabled: false,
        hasBeenModified: false,
        type: this.schema.type,
        required: !!this.schema.required,
        pattern: this.schema.pattern,
        domainValue: this.schema.domainValue,
        multiValue: !!this.schema.multiValue,
        checkDomainValue: this.checkDomainValue
      });

      defaultState = defaultState.set('error', checkError(defaultState, defaultValue));
      defaultState = defaultState.set('canSubmit', !defaultState.get('error'));

      this.newValueStream = _kefir2.default.pool();
      this.refreshStream = _kefir2.default.pool();
      this.newSchemaValueStream = _kefir2.default.pool();
      this.disabledStream = _kefir2.default.pool();
      this.resetStream = _kefir2.default.pool();

      var commands = _kefir2.default.pool();

      var checkedValueCommand = function checkedValueCommand(data) {
        return function (state) {
          var isLoading = state.get('isLoading') - 1;
          if (state.get('value') !== data.value) {
            // value has changed before valueChecker end
            return state.merge({
              isLoading: isLoading,
              canSubmit: !(isLoading || data.error),
              hasBeenModified: _this8.hasBeenModified(state, state.get('value'))
            });
          }
          return state.merge({
            error: data.error,
            isLoading: isLoading,
            canSubmit: !(isLoading || data.error),
            hasBeenModified: _this8.hasBeenModified(state, state.get('value'))
          });
        };
      };

      var newSchemaValueCommand = function newSchemaValueCommand(_ref) {
        var key = _ref.key;
        var value = _ref.value;

        return function (state) {
          var data = state.set(key, _immutable2.default.fromJS(value));
          return data.merge({
            error: getError(data, data.get('value')),
            canSubmit: !(data.get('isLoading') || getError(data, data.get('value')))
          });
        };
      };

      var newValueCommand = function newValueCommand(value) {
        return function (state) {
          if (_this8.schema.valueChecker && !(isNull(value) && isRequired(state))) {
            return state.merge({
              value: value,
              canSubmit: false,
              error: undefined,
              hasBeenModified: _this8.hasBeenModified(state, value)
            });
          }
          if (!checkValue(state, value)) {
            return state.merge({
              value: value,
              error: getError(state, value),
              hasBeenModified: _this8.hasBeenModified(state, value),
              canSubmit: false
            });
          }
          return state.merge({
            value: value,
            error: undefined,
            hasBeenModified: _this8.hasBeenModified(state, value),
            canSubmit: !state.get('isLoading')
          });
        };
      };

      var resetCommand = function resetCommand() {
        return function () {
          return defaultState;
        };
      };

      var isLoadingCommand = function isLoadingCommand() {
        return function (state) {
          return state.update('isLoading', function (x) {
            return x + 1;
          }).set('canSubmit', false);
        };
      };

      var disabledCommand = function disabledCommand(value) {
        return function (state) {
          return state.update('disabled', function (x) {
            return value;
          });
        };
      };

      commands.plug(this.newValueStream.map(function (value) {
        return newValueCommand(value);
      }));
      commands.plug(this.newSchemaValueStream.map(function (obj) {
        return newSchemaValueCommand(obj);
      }));
      commands.plug(this.disabledStream.map(function (value) {
        return disabledCommand(value);
      }));
      commands.plug(this.resetStream.map(function (value) {
        return resetCommand();
      }));

      this.state = commands.scan(function (state, command) {
        return command(state);
      }, defaultState);

      if (this.schema.valueChecker) {
        var stream = this.state.sampledBy(this.newValueStream, function (state, value) {
          return [state, value];
        }).filter(function (_ref2) {
          var _ref3 = _slicedToArray(_ref2, 2);

          var state = _ref3[0];
          var value = _ref3[1];
          return !(isRequired(state) && isNull(value));
        }).debounce(this.schema.valueChecker.debounce || 10).flatMap(function (_ref4) {
          var _ref5 = _slicedToArray(_ref4, 2);

          var state = _ref5[0];
          var value = _ref5[1];

          commands.plug(_kefir2.default.constant(isLoadingCommand()));
          var ajaxRequest = _kefir2.default.fromPromise(_this8.schema.valueChecker.checker(value, _this8.root.document, state));
          return _kefir2.default.constant(value).combine(ajaxRequest, function (value, res) {
            if (!res.checked) return { error: res.error || 'Wrong Input!', value: value };
            return { value: value, error: undefined };
          });
        });
        commands.plug(stream.map(function (value) {
          return checkedValueCommand(value);
        }));
      }

      this.newValueStream.plug(this.state.sampledBy(this.refreshStream, function (state) {
        return state.get('value');
      }));
    }
  }, {
    key: 'onValue',
    value: function onValue(cb) {
      var _this9 = this;

      var fct = undefined;
      this.state.onValue(fct = function (state) {
        return cb(state.toJS());
      });
      return function () {
        return _this9.state.offValue(fct);
      };
    }
  }, {
    key: 'hasBeenModified',
    value: function hasBeenModified(state, value) {
      return castedValue(state, value) !== this.defaultValue;
    }
  }, {
    key: 'htmlType',
    value: function htmlType() {
      switch (this.type) {
        case 'number':
        case 'integer':
          return 'text';
        case 'color':
          return 'color';
        case 'url':
          return 'url';
        case 'file':
          return 'file';
        default:
          return 'text';
      }
    }
  }, {
    key: 'setValue',
    value: function setValue(value) {
      this.newValueStream.plug(_kefir2.default.constant(_immutable2.default.fromJS(value)));
    }
  }, {
    key: 'setSchemaValue',
    value: function setSchemaValue(key, value) {
      this.newSchemaValueStream.plug(_kefir2.default.constant({ key: key, value: value }));
    }
  }, {
    key: 'refresh',
    value: function refresh() {
      this.refreshStream.plug(_kefir2.default.constant(true));
    }
  }, {
    key: 'reset',
    value: function reset() {
      this.resetStream.plug(_kefir2.default.constant(true));
    }
  }, {
    key: 'disabled',
    value: function disabled(value) {
      this.disabledStream.plug(_kefir2.default.constant(!!value));
    }
  }, {
    key: 'checkDomainValue',
    get: function get() {
      return 'checkDomainValue' in this.schema ? this.schema.checkDomainValue : true;
    }
  }, {
    key: 'defaultValue',
    get: function get() {
      return this.root && this.root.getDocumentValue(this.path) || this.schema.defaultValue;
    }
  }, {
    key: 'label',
    get: function get() {
      return this.schema.label;
    }
  }, {
    key: 'type',
    get: function get() {
      return this.schema.type;
    }
  }, {
    key: 'path',
    get: function get() {
      return this.parent.path + '/' + this.key;
    }
  }, {
    key: 'root',
    get: function get() {
      return this.parent && this.parent.root;
    }
  }, {
    key: 'pattern',
    get: function get() {
      return this.schema.pattern;
    }
  }]);

  return Field;
})();

function getPattern(state) {
  return state.get('pattern') || ({
    number: /^[0-9]*(\.[0-9]+)?$/,
    integer: /^[0-9]+$/,
    boolean: /true|false/,
    text: /.*/
  })[state.get('type')];
}

function checkPattern(state, value) {
  return !!String(value).match(getPattern(state));
}

function checkValue(state, value) {
  var _checkValue = function _checkValue(v) {
    if (isNull(v)) return !isRequired(state);
    if (hasDomainValue(state) && mustCheckDomainValue(state)) return checkDomain(state, v);
    return checkPattern(state, v);
  };

  if (isMultiValued(state)) {
    if (!value) return _checkValue();
    if (!value.toJS) return false;
    var v = value.toJS();
    if (!_lodash2.default.isArray(v)) return false;
    if (!v.length) return _checkValue();
    return _lodash2.default.all(v, function (x) {
      return _checkValue(x);
    });
  } else {
    return _checkValue(value);
  }
}

function getDomainValue(state) {
  if (!hasDomainValue(state)) return;

  var domainValue = state.get('domainValue').toJS();
  var first = domainValue[0];
  return _lodash2.default.isObject(first) && 'key' in first ? domainValue : _lodash2.default.map(domainValue, function (v) {
    return { key: v, value: v };
  });
}

function checkDomain(state, value) {
  return _lodash2.default.contains(_lodash2.default.map(getDomainValue(state), function (_ref6) {
    var key = _ref6.key;
    var value = _ref6.value;
    return key;
  }), value);
}

function hasDomainValue(state) {
  return state.get('domainValue');
}

function mustCheckDomainValue(state) {
  return state.get('checkDomainValue');
}

function isMultiValued(state) {
  return state.get('multiValue');
}

function isRequired(state) {
  return state.get('required');
}

function isNull(value) {
  return _lodash2.default.isUndefined(value) || value === "";
}

function castedValue(state, value) {
  if (isMultiValued(state)) return value.toJS ? value.toJS() : [];
  switch (state.get('type')) {
    case 'number':
    case 'integer':
      return Number(value);
    case 'boolean':
      return Boolean(value);
    case 'text':
      if (value === '' || !value) return;
      return value.trim ? value.trim() : value;
    default:
      return value;
  }
}

function getError(state, value) {
  if (isNull(value) && isRequired(state)) return "Input required";
  if (state.get('pattern')) return "Value doesn't match pattern!";
  if (hasDomainValue(state)) return "Value doesn't match domain value!";
  switch (state.get('type')) {
    case 'number':
      return "Value is not a number!";
    case 'integer':
      return "Value is not an integer!";
    case 'boolean':
      return "Value is not an boolean!";
  }
  return "Wrong value!";
}

function checkError(state, value) {
  if (!checkValue(state, value)) return getError(state, value);
}
