# temporalstate [![Build Status](https://travis-ci.org/mwri/temporalstate.svg?branch=master)](https://travis-ci.org/mwri/temporalstate) [![Coverage Status](https://coveralls.io/repos/github/mwri/temporalstate/badge.svg?branch=master)](https://coveralls.io/github/mwri/temporalstate?branch=master)

## Quick start

Temporal state is a library for building, manipulating and deriving the
state of a collection of variables over time. It is efficient, using
binary trees, and will scale to big data sets.

For example, if you create a temporalstate object and tell it the **weather**
is `"raining"` at **t = 5** it can then be derived that the **weather** is
`null` from the start of time until **t = 5**, and from then until the end
of time it is `"raining"`. You can derive the value for **weather** at any
time in fact.

If you also add that the **moon** is `"crescent"` at **t = 3** and introduce
data concerning any number of other variables, then the full set of all variable
values can be derived for any given time.

The value of any variable before the time of its first value will be
`null`, and the chronologically last value of a variable will persist forever.

Take this example time line, with three variables, weather, moon and sun:

![IMAGE DISPLAY ERROR](mddocs/state_changes_eg.png)

Building up this state would be done as follows:

```javascript
import temporalstate from 'temporalstate';

let db = new temporalstate();

db.add_change({'timestamp': 5, 'name': 'weather', 'val': 'raining'});
db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
db.add_change({'timestamp': 40, 'name': 'weather', 'val': 'foggy'});
db.add_change({'timestamp': 3, 'name': 'moon', 'val': 'crescent'});
db.add_change({'timestamp': 25, 'name': 'moon', 'val': 'full'});
db.add_change({'timestamp': 35, 'name': 'moon', 'val': 'super'});
db.add_change({'timestamp': 12, 'name': 'sun', 'val': 'rising'});
db.add_change({'timestamp': 27, 'name': 'sun', 'val': 'setting'});
```

It doesn't matter what order the state changes are added, the state of the
whole thing will always reflect the changes that have been entered in so far.

The state of a single variable at any time can be queried by calling `state()`
with two arguments:

```javascript
db.state(0, 'moon') == null
db.state(2, 'moon') == null
db.state(3, 'moon') == 'crescent'
db.state(19, 'moon') == 'crescent'
db.state(20, 'moon') == 'crescent'
db.state(34, 'moon') == 'full'
db.state(35, 'moon') == 'super'
db.state(40, 'moon') == 'super'
db.state(9999, 'moon') == 'super'
```

The state of all variables at any time can be queried by calling `state()`
with a single argument:

```javascript
db.state(0) == {}
db.state(10) == { weather: 'raining', moon: 'crescent' }
db.state(20) == { weather: 'sunny', moon: 'crescent', sun: 'rising' }
db.state(30) == { weather: 'sunny', moon: 'full', sun: 'setting' }
db.state(40) == { weather: 'foggy', moon: 'super', sun: 'setting' }
db.state(999999) == { weather: 'foggy', moon: 'super', sun: 'setting' }
```

You can also regurgitate all the changes which constitute the current
all time state by calling `change_list()`:

```javascript
db.change_list() === [
  { timestamp: 3, name: 'moon', val: 'crescent' },
  { timestamp: 5, name: 'weather', val: 'raining' },
  { timestamp: 12, name: 'sun', val: 'rising' },
  { timestamp: 20, name: 'weather', val: 'sunny' },
  { timestamp: 25, name: 'moon', val: 'full' },
  { timestamp: 27, name: 'sun', val: 'setting' },
  { timestamp: 35, name: 'moon', val: 'super' },
  { timestamp: 40, name: 'weather', val: 'foggy' } ]
]
```

Note that this data is parsimonious, no valueless data is kept, so if
you add a change to the effect that it is raining at time 5, this will
not change the change list or any other derivation at all. Similarly
if it is raining at 5, sunny at 10 and raining again at 15, if you
then say it is raining at 10 the number of changes is optimised down
to just the one rainining at 5 record.

The **time** is given as an integer in the examples above, but a **Date**
object, a **float** or a **string** can be used instead. Anything that
can be compared with the less than and greater than comparison operators
will work.

## Contents

1. [Quick start](#quick-start).
2. [Contents](#contents).
3. [Full API reference](#full-api-reference).
   1. [Functions](#functions).
      1. [constructor](#constructor).
      2. [add_change](#add_change).
      3. [remove_change](#remove_change).
      4. [change_list](#change_list).
      5. [var_list](#var_list).
      6. [first](#first).
      7. [last](#last).
      8. [next](#next).
      9. [prev](#prev).
      10. [at](#at).
      11. [after](#after).
      12. [before](#before).
      13. [state](#state).
      14. [state_detail](#state_detail).
      15. [remove_var](#remove_var).
      16. [change_cmp](#change_cmp).
   2. [Events](#events).
      1. [new_var](#new_var).
      2. [rm_var](#rm_var).
      3. [add](#add).
      4. [rm](#rm).
      5. [change](#change).
      6. [txn_start](#txn_start).
      7. [txn_end](#txn_end).

## Full API reference

Import the `temporalstate` constructor with import:

```javascript
import temporalstate from 'temporalstate';
```

Or with require:

```javascript
let temporalstate = require('temporalstate').default;
```

### Functions

#### constructor

Constructs a `temporalstate` object.

```javascript
let db = new temporalstate();
```

NOTE in the examples of this documentation, simple scalar values
are employed; strings such as `'raining'` and `'super'`. There is
nothing to stop you from using complex structures instead EXCEPT
that `temporalstate` needs to know how to determine their
equality! So, if you use complex structures you must provide
an equality checking function, like this:

```javascript
let db = new temporalstate({
    'valeqf': function (a, b) {
        // return true if the values are equal, otherwise false
        return JSON.stringify(a) === JSON.stringify(b);
    }
});
```

This one is a bit of a get out of jail free card because it is
highly likely to work for almost any structure you employ. Use
this if it is appropriate, but an equality function more
specific to your data might be more efficient (for example the
function `function (a, b) { return a.complex === b.complex; }`
is used in the unit tests), if that is possible.

#### add_change

Adds a change to the temporal data. If the change is redundant
or renders other current changes redundant they will be trimmed
so that the data is always kept parsimonious.

A single object parameter with 'timestamp', 'name' and 'val' keys
is required, these being the time of the change, the name of the
variable changing and the value it is changing to.

```javascript
db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
db.add_change({'timestamp': 40, 'name': 'weather', 'val': 'foggy'});
db.add_change({'timestamp': 3, 'name': 'moon', 'val': 'crescent'});
```

#### remove_change

Removes a change. The call will have no affect if the change does not
exist.

```javascript
db.remove_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
```

#### change_list

Returns the set of all known changes.

```javascript
let changes = db.change_list();
```

Here, `changes` will be a list of objects, each with `timestamp`,
`name` and a `val` keys, for example like this:

```javascript
[
  { timestamp: 3,  name: 'moon',    val: 'crescent' },
  { timestamp: 5,  name: 'weather', val: 'raining'  },
  { timestamp: 12, name: 'sun',     val: 'rising'   },
  { timestamp: 20, name: 'weather', val: 'sunny'    },
  { timestamp: 25, name: 'moon',    val: 'full'     },
  { timestamp: 27, name: 'sun',     val: 'setting'  },
  { timestamp: 35, name: 'moon',    val: 'super'    },
  { timestamp: 40, name: 'weather', val: 'foggy'    },
]
```

#### var_list

Returns a list of known variables. This will include variables
without states, if there are any. The result is sorted.

```javascript
let vars = db.var_list();
```

Here, `vars` will be a list of variable names, like this:

```javascript
[
  'moon',
  'sun',
  'weather',
]
```

#### first

Without a parameter, `first()` returns the first change(s) (i.e.
the first ranked by time). The return value is a list, and will
contain all the changes which have a time equal to the lowest time
in the database. So this will probably usually be a list of one
change, but could be any number. The return value can also be `null`
if there are no changes in the database.

```javascript
let first_changes = db.first();
```

Here, `first_changes` will be a list of objects just like those
returned by [change_list](#change_list) above:

```javascript
[ { timestamp: 3, name: 'moon', val: 'crescent' } ]
```

Or it could be:

```javascript
[
  { timestamp: 3, name: 'moon',        val:  'crescent' },
  { timestamp: 3, name: 'temperature', val:  22         },
]
```

The time will always be the same if there are multiple
changes.

If a variable name is passed as a parameter, only that
variable is considered and a single change is returned instead
of a list. For example:

```javascript
let first_change = db.first('weather');
```

Here `first_change` could be:

```
{ timestamp: 3, name: 'moon', val: 'crescent' }
```

#### last

This is like [first](#first) but it returns the last change(s).
Again there can be multiple changes if their time is the same
and again the return value can instead be `null` if there are
no changes in the database. Also if a parameter is employed
to provide a variable name, then a single change is returned
(the last of that variable).

```javascript
let last_changes = db.last();
```

Here, `last_changes` will be a list of objects just like those
returned by [change_list](#change_list) and [first](#first)
above:

```javascript
[ { timestamp: 40, name: 'weather', val: 'foggy' } ]
```

Or it could be:

```javascript
[
  { timestamp: 40, name: 'temperature', val: 18      },
  { timestamp: 40, name: 'weather',     val: 'foggy' },
]
```
If a variable name is passed as a parameter, only that
variable is considered and a single change is returned instead
of a list. For example:

```javascript
let last_change = db.last('weather');
```

Here `last_change` could be:

```
{ timestamp: 40, name: 'weather', val: 'foggy' }
```

#### next

This returns the next change (after the one passed as an
argument). If one paramter is given then much like
[first](#first) and [last](#last), multiple changes may
be returned if they are of the same time.

```javascript
let next_changes = db.next({timestamp: 20, name: 'weather', val: 'sunny'});
```

Here, `next_changes` will be a list of objects, like:

```javascript
[ { timestamp: 25, name: 'moon', val: 'full' } ]
```

Or it could be:

```javascript
[
  { timestamp: 25, name: 'moon',        val: 'full' },
  { timestamp: 25, name: 'temperature', val: 25     },
]
```

If a second parameter is given, then either `null` or the next
change for that variable is returned (not an array of changes).

#### prev

This returns the previous change (after the one passed as an
argument). If one paramter is given then much like
[prev](#prev) multiple changes may be returned if they are
of the same time.

```javascript
let prev_changes = db.prev({timestamp: 20, name: 'weather', val: 'sunny'});
```

Here, `prev_changes` will be a list of objects, like:

```javascript
[ { timestamp: 12, name: 'sun', val: 'rising' },
```

Or it could be:

```javascript
[
  { timestamp: 12, name: 'sun',         val: 'rising' },
  { timestamp: 12, name: 'temperature', val: 14       },
]
```

If a second parameter is given, then either `null` or the previous
change for that variable is returned (not an array of changes).

#### at

Returns the change(s) occurring at exactly the specified time.
The required time is passed as an argument. Because multiple
changes (of different variables) could match the return value
is an array. For example:

```javascript
let changes_at = db.at(10);
```

Returns an empty list if there are no changes at the specified
time.

If a variable name is specified as an argument, then a single
change is returned, or `null` if there is none at the specified
time.

#### after

Returns the change(s) occurring closest after the specified time.
The required time is passed as an argument. Because multiple
changes (of different variables) could match (if they share the
closest time) the return value is an array. For example:

```javascript
let changes_after = db.after(20);
```

If the time specified is after the last known change, then
`null` is returned.

#### before

Returns the change(s) occurring closest before the specified time.
The required time is passed as an argument. Because multiple
changes (of different variables) could match (if they share the
closest time) the return value is an array. For example:

```javascript
let changes_before = db.before(20);
```

If the time specified is before the first known change, then
`null` is returned.

#### state

Returns the state at any given time. Takes either one or two
arguments, the first, compulsory parameter, is the time, and
the second is the name of a state. If no state name is given
then all states that have a value at the given time will be
returned as an object, with the keys being state names and
the values being the state values. Where a state name is
given the return value will be the states value, or null if
it does not have a value at that time.

With a single argument:

```javascript
all_states_at_20_time = db.state(20);
```

Here `all_states_at_20_time` will contain something like this:

```javascript
{ weather: 'sunny', moon: 'crescent', sun: 'rising' }
```

With a second argument:

```javascript
weather_at_20_time = db.state(20, 'weather');
```

Here `weather_at_20_time` will contain something like this:

```javascript
'sunny'
```

#### state_detail

State detail, like [state](#state) takes one or two arguments, the
time, and optionally a state name. It also similarly returns state
data, but instead of just the state values at the specified time
it returns data concerning when the state became that value (which
will be at or before the time passed as argument one) and data
concerning when it ceases to be that value (which will be after
the time passed as argument one) and what the next value is.

The return value when a second argument (state name) is passed
is of the form `{'from': current_change, 'to': next_change}`, where
`current_change` and `next_change` are formatted like the
changes returned by [change_list](#change_list), something like
`{ timestamp: 3, name: 'moon', val: 'crescent' }`.

```javascript
let weather_details_at_20_time = db.state_detail(20, 'weather');
```

The value of `weather_details_at_20_time` would now be something
like:

```javascript
{
  from: { timestamp: 20, name: 'weather', val: 'sunny' },
  to:   { timestamp: 40, name: 'weather', val: 'foggy' },
}
```

The return value when only a single argument (the time) is passed
is a list of such from to structures.

In all cases, where the time given is before the first value of a
state, `null` is the `to` value, and where the time given is after
the last change (or equal in time to it), `null` is the `from`
value. Where no data exists for a state name the return value or
the state name is unknown, then `null` is returned instead of
`{'from': null, 'to': null}`, for that state.

```javascript
let all_states_at_30_time = db.state_detail(30);
```

The value of `all_states_at_30_time` would now be something
like:

```javascript
[
  { from: { timestamp: 25, name: 'moon', val: 'full' },
    to:   { timestamp: 35, name: 'moon', val: 'super' },
  },
  {
    from: { timestamp: 27, name: 'sun', val: 'setting' },
    to:   null,
  },
  {
    from: { timestamp: 20, name: 'weather', val: 'sunny' },
    to:   { timestamp: 40, name: 'weather', val: 'foggy' },
  }
]
```

The ordering of the list is done by the state name

#### remove_var

When removing a change (explicitly or implicitly), if it is the last
remaining change in the database, though there will be no changes
for that variable any more, the variable will still exist; calling
`var_list()` will list it.

If it is desirable to get rid of it entirely, call `remove_var`
and provide the variable name as a parameter. For example:

```javascript
db.remove_var('weather');
```

If a variable is removed `true` is returned, or else `false`.

A variable is not removed if it does not exist, or if it has
changes (i.e. it must be unused).

#### change_cmp

This is a static function, not a class method, it takes two
arguments and provides the sort order for changes (as returned
by [change_list](#change_list)) by returning 1, 0 or -1, like
all sort element comparison functions.

The order of changes is determined first by the time of the
change, and then by the name of the state.

### Events

Events are emitted before a change actually takes effect. In the case
of transaction events, the [txn_start](#txn_start), is emitted first of
all, then applicable [add](#add) and [rm](#rm) events one by one proceeded
by the execution of the respective add or remove action, and finally the
[txn_end](#txn_end) event.

#### new_var

The **new_var** event is emitted when a new variable is realised.
Adding an event with a variable name not seen before will cause
this.

```javascript
db.on('new_var', (name) => {
    console.log('added "'+name+'", not seen before');
});
```

#### rm_var

The **rm_var** event is emitted when a new variable is removed.
This can only happen as a result of a call to `remove_var`.

```javascript
db.on('rm_var', (name) => {
    console.log('removed "'+name+'" variable');
});
```

#### add

The **add** event is emitted when a change is added to the database.

```javascript
db.on('add', (change) => {
    console.log('added a change (at '+change.timestamp+' '+change.name+' = '+change.val+')');
});
```

Note that this event will only fire for an actual change, so if
a change is added that is redundant, no event will occur.

#### rm

The **rm** event is emitted when a change is eliminated from the
database.

```javascript
db.on('rm', (change) => {
    console.log('removed a change (at '+change.timestamp+' '+change.name+' = '+change.val+')');
});
```

Changes may be removed to preserve the parsimony of the database so
the change removal need not be explicit.

#### change

The **change** event is emitted when a change is made that alters the
value of an existing variable at a time when that variable already
has a change.

```javascript
db.on('change', (prev, new_val) => {
    console.log('change '+prev.name+' = '+prev.val+' at '+prev.timestamp+' changing to '+new_val);
});
```

#### txn_start

The **txn_start** event is emitted when any change occurs. A change
may result in multiple operations however (and hence as a result a
number of **add**, **rm** or **change** events may be emitted)
so if it is desired to either capture these as one transaction
or to capture the original requested change that caused them, the
transaction events should be used (**txn_start** or **txn_end**).

```javascript
db.on('txn_start', (change, ops) => {
    console.log('change requested:');
    console.log(change);
    console.log('operations which will be done:');
    console.log(ops);
});
```

For example, if the following changes are added (to an empty
database):

```javascript
db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
db.add_change({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
```

Then this change is added:

```javascript
db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
```

The **txn_start** event will be emitted with the first argument being
`{'add': {'timestamp': 20, 'name': 'weather', 'val': 'raining'}}`
and the second being `[{'remove': {'timestamp': 20, 'name': 'weather',
'val': 'sunny'}}, {'remove': {'timestamp': 30, 'name': 'weather',
'val': 'raining'}}]`.

Most changes will of course usually result in a transaction with
a single operation which is identical to the actual change requested.

If a change is due to a `remove_change` call instead of a `add_change`
then there can only be one operation, but in addition to the **rm**
event, a **txn_start** even is also emitted. In the case of the following
removal for example:

```javascript
db.remove_change('weather', 'raining', 20);
```

...the **txn_start** event will be emitted with the first argument being
`{'remove': {'timestamp': 20, 'name': 'weather', 'val': 'raining'}}`
and the second being `[{'remove': {'timestamp': 20, 'name': 'weather',
'val': 'raining'}}]`.

#### txn_end

The **txn_end** event is exactly like the **txn_start** event described
above, except that it is emitted after all the changes have been
executed.
