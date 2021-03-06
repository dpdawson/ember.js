import Ember from 'ember-metal/core';
import {addObserver} from 'ember-metal/observer';
import {computed} from 'ember-metal/computed';
import {mapBy, union, sort} from 'ember-runtime/computed/reduce_computed_macros';
import run from 'ember-metal/run_loop';
import {defineProperty} from "ember-metal/properties";
import compare from 'ember-runtime/compare';
import testBoth from 'ember-metal/tests/props_helper';
import EmberObject from 'ember-runtime/system/object';

if (Ember.FEATURES.isEnabled('composable-computed-properties')) {
  var obj;

  QUnit.module('computed - composable', {
    teardown: function () {
      if (obj && obj.destroy) {
        run(function() {
          obj.destroy();
        });
      }
    }
  });

  testBoth('should be able to take a computed property as a parameter for ember objects', function(get, set) {
    var not = computed.not;
    var equals = computed.equal;

    obj = EmberObject.extend({
      firstName: null,
      lastName: null,
      state: null,
      napTime: not(equals('state', 'sleepy'))
    }).create({
      firstName: 'Alex',
      lastName: 'Navasardyan',
      state: 'sleepy'
    });

    equal(get(obj, 'firstName'), 'Alex');
    equal(get(obj, 'lastName'), 'Navasardyan');

    equal(get(obj, 'state'), 'sleepy');
    equal(get(obj, 'napTime'), false);

    set(obj, 'state', 'not sleepy');
    equal(get(obj, 'state'), 'not sleepy');
    equal(get(obj, 'napTime'), true);
  });

  testBoth('should work with plain JavaScript objects', function(get, set) {
    var not = computed.not;
    var equals = computed.equal;

    obj = {
      firstName: 'Alex',
      lastName: 'Navasardyan',
      state: 'sleepy'
    };

    defineProperty(obj, 'napTime', not(equals('state', 'sleepy')));

    equal(get(obj, 'firstName'), 'Alex');
    equal(get(obj, 'lastName'), 'Navasardyan');

    equal(get(obj, 'state'), 'sleepy');
    equal(get(obj, 'napTime'), false);

    set(obj, 'state', 'not sleepy');
    equal(get(obj, 'state'), 'not sleepy');
    equal(get(obj, 'napTime'), true);
  });

  testBoth('should be able to take many computed properties as parameters', function(get, set) {
    var and     = computed.and;
    var equals  = computed.equal;
    var not     = computed.not;
    var obj = EmberObject.extend({
          firstName: null,
          lastName: null,
          state: null,
          hungry: null,
          thirsty: null,
          napTime: and(equals('state', 'sleepy'), not('hungry'), not('thirsty'))
        }).create({
          firstName: 'Alex',
          lastName:  'Navasardyan',
          state:     'sleepy',
          hungry:    true,
          thirsty:   false
        });

    equal(get(obj, 'firstName'), 'Alex');
    equal(get(obj, 'lastName'), 'Navasardyan');

    equal(get(obj, 'state'), 'sleepy');
    equal(get(obj, 'napTime'), false);

    set(obj, 'state', 'not sleepy');
    equal(get(obj, 'state'), 'not sleepy');
    equal(get(obj, 'napTime'), false);

    set(obj, 'state', 'sleepy');
    set(obj, 'thristy', false);
    set(obj, 'hungry', false);
    equal(get(obj, 'napTime'), true);
  });

  testBoth('composable computed properties can be shared between types', function (get, set) {
    var not = computed.not;
    var equals = computed.equal;
    var notSleepy = not(equals('state', 'sleepy'));
    var Type0 = EmberObject.extend({
        state: null,
        napTime: notSleepy
      });
    var Type1 = EmberObject.extend({
        state: null,
        napTime: notSleepy
      });
    var obj0 = Type0.create({ state: 'sleepy'});
    var obj1 = Type1.create({ state: 'sleepy' });

    equal(get(obj0, 'state'), 'sleepy');
    equal(get(obj0, 'napTime'), false);

    set(obj0, 'state', 'not sleepy');
    equal(get(obj0, 'state'), 'not sleepy');
    equal(get(obj0, 'napTime'), true);

    equal(get(obj1, 'state'), 'sleepy');
    equal(get(obj1, 'napTime'), false);

    set(obj1, 'state', 'not sleepy');
    equal(get(obj1, 'state'), 'not sleepy');
    equal(get(obj1, 'napTime'), true);
  });

  testBoth('composable computed properties work with existing CP macros', function(get, set) {
    var not = computed.not;
    var equals = computed.equal;
    var observerCalls = 0;

    obj = EmberObject.extend({
      firstName: null,
      lastName: null,
      state: null,
      napTime: not(equals('state', 'sleepy'))
    }).create({
      firstName: 'Alex',
      lastName: 'Navasardyan',
      state: 'sleepy'
    });

    addObserver(obj, 'napTime', function () {
      ++observerCalls;
    });

    equal(get(obj, 'napTime'), false);
    equal(observerCalls, 0);

    set(obj, 'state', 'not sleepy');
    equal(observerCalls, 1);
    equal(get(obj, 'napTime'), true);
  });

  testBoth('composable computed properties work with arrayComputed properties', function (get, set) {
    obj = EmberObject.extend({
      names: sort(
              union(mapBy('people', 'firstName'), mapBy('people', 'lastName'), 'cats'),
              compare
             )
    }).create({
      people: Ember.A([{
        firstName: 'Alex', lastName: 'Navasardyan'
      }, {
        firstName: 'David', lastName: 'Hamilton'
      }]),
      cats: Ember.A(['Grey Kitty', 'Little Boots'])
    });

    deepEqual(get(obj, 'names'), ['Alex', 'David', 'Grey Kitty', 'Hamilton', 'Little Boots', 'Navasardyan']);
  });

  testBoth('composable computed properties work with CPs that have no dependencies', function (get, set) {
    var not = computed.not;
    var constant = function (c) {
          return computed(function () {
            return c;
          });
        };

    obj = EmberObject.extend({
      p: not(constant(true))
    }).create();

    equal(get(obj, 'p'), false, "ccp works with dependencies that themselves have no dependencies");
  });

  testBoth('composable computed properties work with depKey paths', function (get, set) {
    var not = computed.not;
    var alias = computed.alias;

    obj = EmberObject.extend({
      q: not(alias('indirection.p'))
    }).create({
      indirection: { p: true }
    });

    equal(get(obj, 'q'), false, "ccp is initially correct");

    set(obj, 'indirection.p', false);

    equal(get(obj, 'q'), true, "ccp is true after dependent chain updated");
  });

  testBoth('composable computed properties work with macros that have non-cp args', function (get, set) {
    var equals = computed.equal;
    var or = computed.or;

    obj = EmberObject.extend({
      isJaime: equals('name', 'Jaime'),
      isCersei: equals('name', 'Cersei'),

      isEither: or( equals('name', 'Jaime'),
                    equals('name', 'Cersei'))
    }).create({
      name: 'Robb'
    });

    equal(false, get(obj, 'isEither'), "Robb is neither Jaime nor Cersei");

    set(obj, 'name', 'Jaime');

    equal(true, get(obj, 'isEither'), "Jaime is either Jaime nor Cersei");

    set(obj, 'name', 'Cersei');

    equal(true, get(obj, 'isEither'), "Cersei is either Jaime nor Cersei");

    set(obj, 'name', 'Tyrion');

    equal(false, get(obj, 'isEither'), "Tyrion is neither Jaime nor Cersei");
  });
}
