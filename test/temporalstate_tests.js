import chai_jasmine from 'chai-jasmine';
import temporalstate from './../lib/temporalstate.js';
import bintrees from 'bintrees';


describe('temporalstate', () => {
    
    describe('integration', () => {
        
        it('bintrees behaves as expected', () => {
            let tree = new bintrees.RBTree(function (a, b) { return a - b; });
            expect(tree.size).to.eql(0);
            expect(tree.insert(5)).to.eql(true);
            expect(tree.insert(5)).to.eql(false);
            expect(tree.size).to.eql(1);
            expect(tree.insert(10)).to.eql(true);
            expect(tree.insert(15)).to.eql(true);
            expect(tree.insert(40)).to.eql(true);
            expect(tree.size).to.eql(4);
            expect(tree.find(5)).to.eql(5);
            expect(tree.find(4)).to.eql(null);
            expect(tree.find(6)).to.eql(null);
            expect(tree.find(10)).to.eql(10);
            expect(tree.find(15)).to.eql(15);
            expect(tree.find(40)).to.eql(40);
            expect(tree.find(50)).to.eql(null);
            let i1 = tree.iterator();
            expect(i1.data()).to.eql(null);
            expect(i1.next()).to.eql(5);
            expect(i1.data()).to.eql(5);
            expect(i1.next()).to.eql(10);
            expect(i1.data()).to.eql(10);
            expect(i1.next()).to.eql(15);
            expect(i1.data()).to.eql(15);
            expect(i1.next()).to.eql(40);
            expect(i1.data()).to.eql(40);
            expect(i1.next()).to.eql(null);
            expect(i1.data()).to.eql(null);
            expect(i1.next()).to.eql(5);
            expect(i1.data()).to.eql(5);
            expect(i1.prev()).to.eql(null);
            expect(i1.data()).to.eql(null);
            expect(i1.prev()).to.eql(40);
            expect(i1.data()).to.eql(40);
            let i2 = tree.lowerBound(8);
            expect(i2.data()).to.eql(10);
            expect(i2.next()).to.eql(15);
            expect(i2.data()).to.eql(15);
            expect(i2.next()).to.eql(40);
            expect(i2.data()).to.eql(40);
            let i3 = tree.lowerBound(10);
            expect(i3.data()).to.eql(10);
            let i4 = tree.upperBound(10);
            expect(i4.data()).to.eql(15);
            expect(i4.next()).to.eql(40);
            expect(i4.data()).to.eql(40);
            expect(i4.next()).to.eql(null);
            expect(i4.data()).to.eql(null);
            let i5 = tree.upperBound(3);
            expect(i5.data()).to.eql(5);
            expect(i5.prev()).to.eql(null);
        });

    });

    describe('static', () => {

        describe('cmp_change', () => {

            (function (test_formats) {
                for (let test_format in test_formats) {
                    let format_convert_f = test_formats[test_format];
                    describe('time as '+test_format, () => {
                        (function (tests) {
                            for (let test_descr in tests) {
                                let test = tests[test_descr];
                                let a = test.a;
                                let b = test.b;
                                a.timestamp = format_convert_f(a.timestamp);
                                b.timestamp = format_convert_f(b.timestamp);
                                let a_descr = '{timestamp:'+a.timestamp+',name:'+a.name+',val:'+a.val+'}';
                                let b_descr = '{timestamp:'+b.timestamp+',name:'+b.name+',val:'+b.val+'}';
                                test_descr = test.d
                                    .replace('${a}', a_descr)
                                    .replace('${b}', b_descr)
                                    .replace(/ /g, '');
                                it(test_descr, function () {
                                    expect(test.f(temporalstate.change_cmp(a, b))).toBe(true);
                                });
                            }
                        })({
                            'sort (a, b) < 0 when a timestamp < b timestamp, a name < b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 10, 'name': 'ne', 'val': 've'},
                                'f': (r) => r < 0,
                                'd': 'sort(${a},${b}) < 0',
                            },
                            'sort (a, b) < 0 when a timestamp < b timestamp, a name > b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 11, 'name': 'nc', 'val': 'vc'},
                                'f': (r) => r < 0,
                                'd': 'sort(${a},${b}) < 0',
                            },
                            'sort (a, b) > 0 when a timestamp > b timestamp, a name < b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 8, 'name': 'ne', 'val': 've'},
                                'f': (r) => r > 0,
                                'd': 'sort(${a},${b}) > 0',
                            },
                            'sort (a, b) > 0 when a timestamp > b timestamp, a name > b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 7, 'name': 'nc', 'val': 'vc'},
                                'f': (r) => r > 0,
                                'd': 'sort(${a},${b}) > 0',
                            },
                            'sort (a, b) < 0 when a timestamp = b timestamp, a name < b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 9, 'name': 'ne', 'val': 've'},
                                'f': (r) => r < 0,
                                'd': 'sort(${a},${b}) < 0',
                            },
                            'sort (a, b) > 0 when a timestamp = b timestamp, a name > b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 9, 'name': 'nc', 'val': 'vc'},
                                'f': (r) => r > 0,
                                'd': 'sort(${a},${b}) > 0',
                            },
                            'sort (a, b) = 0 when a timestamp = b timestamp, a name = b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'f': (r) => r === 0,
                                'd': 'sort(${a},${b}) = 0',
                            },
                        });
                    });
                }
            })({
                'integer': (int_val) => {
                    return int_val;
                },
                'float': (int_val) => {
                    return int_val * Math.PI;
                },
                'string': (int_val) => {
                    return String.fromCharCode(97+int_val);
                },
                'Date()': (int_val) => {
                    let timedate = new Date();
                    timedate.setSeconds(timedate.getSeconds()+(int_val*10));
                    return timedate;
                },
            });

        });

    });

    describe('constructor', () => {

        it('does not fail', () => {
            let db = new temporalstate();
        });

        describe('initial object state', () => {

            beforeEach(function () {
                this.db = new temporalstate();
            });

            it('has empty change list', function () {
                expect(this.db.change_list()).to.be.an('array').is.lengthOf(0);
            });

        });

    });

    describe('add_change (using change_list)', () => {

        beforeEach(function () {
            this.db = new temporalstate();
        });

        it('adds changes to change list', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            // add change
            db.add_change('weather', 'raining', 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            // add change changing existing state
            db.add_change('weather', 'sunny', 20);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            // add change changing different, non existing state
            db.add_change('moon', 'full', 30);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(3)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 30, 'name': 'moon', 'val': 'full'});
        });

        it('does not add change list when change name, time and value are duplicates', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change('weather', 'raining', 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
        });

        it('updates change list when change timestamp and name already exists but value changes (first of many changes)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            db.add_change('weather', 'foggy', 20);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
            db.add_change('weather', 'sunny', 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
        });

        it('updates change list when change timestamp and name already exists but value changes (not first change)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            db.add_change('weather', 'foggy', 20);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
            db.add_change('weather', 'depressing', 20);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'depressing'});
        });

        it('updates change list when change timestamp and name already exists but value changes (first and only change)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change('weather', 'sunny', 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'sunny'});
        });

        it('non state changing changes are optimised away (no change after final update)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change('weather', 'raining', 20);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
        });

        it('proceeding redundant changes are optimised away (change before first update)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change('weather', 'raining', 5);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 5, 'name': 'weather', 'val': 'raining'});
        });

        it('redundant changes that make another change redundant are optimised (ABA reduces to A)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            db.add_change('weather', 'sunny', 20);
            db.add_change('weather', 'raining', 30);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(3)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
            db.add_change('weather', 'raining', 20);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
        });

        it('redundant changes that make another change redundant are optimised (BA reduces to A)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'sunny', 20);
            db.add_change('weather', 'raining', 30);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
            db.add_change('weather', 'raining', 20);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
        });

        it('redundant changes that make another change redundant are optimised (ABC reduces to AC)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            db.add_change('weather', 'sunny', 20);
            db.add_change('weather', 'foggy', 30);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(3)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 30, 'name': 'weather', 'val': 'foggy'});
            db.add_change('weather', 'raining', 20);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 30, 'name': 'weather', 'val': 'foggy'});
        });

        it('a null state can be set like any other state value', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            db.add_change('weather', null, 20);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': null});
            expect(db.state(15, 'weather')).to.eql('raining');
            expect(db.state(25, 'weather')).to.eql(null);
        });

        it('a null state can delete the last state value, leaving no changes', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change('weather', 'raining', 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change('weather', null, 10);
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
        });
        
    });

    describe('change_list', () => {

        beforeEach(function () {
            this.db = new temporalstate();
        });

        (function (tests) {
            for (let test_descr in tests) {
                it('is ordered ('+test_descr+')', function () {
                    let test = tests[test_descr];
                    let db = this.db;
                    test.forEach((c) => { db.add_change(c.name, c.val, c.timestamp); });
                    let ts_ordered_cl = test.slice().sort(temporalstate.change_cmp);
                    expect(db.change_list())
                        .to.be.an('array')
                        .is.lengthOf(test.length)
                        .toEqual(ts_ordered_cl);
                });
            }
        })({
            'single change name': [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
            ],
            'multiple change names': [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                {'timestamp': 50, 'name': 'moon', 'val': 'super'},
                {'timestamp': 40, 'name': 'weather', 'val': 'foggy'},
                {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
            ],
            'multiple change names with duplicate timestamps': [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                {'timestamp': 50, 'name': 'moon', 'val': 'super'},
                {'timestamp': 15, 'name': 'weather', 'val': 'foggy'},
                {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
            ],
        });

    });

    describe('state derivation', () => {

        beforeEach(function () {
            let db = new temporalstate();
            for (let change of [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                {'timestamp': 50, 'name': 'moon', 'val': 'super'},
                {'timestamp': 25, 'name': 'sun', 'val': 'spotty'},
                {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
                {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
            ]) {
                db.add_change(change.name, change.val, change.timestamp);
            }
            this.db = db;
        });

        describe('state', () => {

            it('is empty before first change (specified state)', function () {
                let db = this.db;
                expect(db.state(0, 'weather'))
                    .to.be.an('null');
                expect(db.state(1, 'moon'))
                    .to.be.an('null');
            });

            it('is empty before first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state(0, 'missing'))
                    .to.be.an('null');
            });

            it('is empty before first change (all states)', function () {
                let db = this.db;
                expect(db.state(0))
                    .to.be.an('object')
                    .to.eql({});
                expect(db.state(1))
                    .to.be.an('object')
                    .to.eql({});
            });

            it('reflects first change at first change (specified state)', function () {
                let db = this.db;
                expect(db.state(10, 'weather'))
                    .to.be.an('string')
                    .to.eql('raining');
            });

            it('is empty at first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state(10, '404'))
                    .to.be.an('null');
            });

            it('is empty at first change (specified different state)', function () {
                let db = this.db;
                expect(db.state(10, 'moon'))
                    .to.be.an('null');
            });

            it('reflects first change after first change (specified state)', function () {
                let db = this.db;
                expect(db.state(11, 'weather'))
                    .to.be.an('string')
                    .to.eql('raining');
            });

            it('is empty after first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state(11, '404'))
                    .to.be.an('null');
            });

            it('is empty after first change (specified different state)', function () {
                let db = this.db;
                expect(db.state(11, 'moon'))
                    .to.be.an('null');
            });

            it('reflects first change at first change (all states)', function () {
                let db = this.db;
                expect(db.state(10))
                    .to.be.an('object')
                    .to.eql({'weather': 'raining'});
            });

            it('reflects first change after first change (all states)', function () {
                let db = this.db;
                expect(db.state(11))
                    .to.be.an('object')
                    .to.eql({'weather': 'raining'});
            });

            it('reflects first and second change at second change', function () {
                let db = this.db;
                expect(db.state(15))
                    .to.be.an('object')
                    .to.eql({'moon': 'full', 'weather': 'raining'});
            });

            it('reflects first and second change after second change', function () {
                let db = this.db;
                expect(db.state(17))
                    .to.be.an('object')
                    .to.eql({'moon': 'full', 'weather': 'raining'});
            });

            it('new changes of state replace previous changes at new change (specified state)', function () {
                let db = this.db;
                expect(db.state(20, 'weather'))
                    .to.be.an('string')
                    .to.eql('sunny');
            });

            it('new changes of state replace previous changes after new change (all states)', function () {
                let db = this.db;
                expect(db.state(21))
                    .to.be.an('object')
                    .to.eql({'moon': 'full', 'weather': 'sunny'});
            });

            it('all the latest state changes prevail at last change (specific state)', function () {
                let db = this.db;
                expect(db.state(50, 'weather'))
                    .to.be.an('string')
                    .to.eql('foggy');
                expect(db.state(50, 'sun'))
                    .to.be.an('string')
                    .to.eql('spotty');
                expect(db.state(50, 'moon'))
                    .to.be.an('string')
                    .to.eql('super');
            });

            it('all the latest state changes prevail at last change (all states)', function () {
                let db = this.db;
                expect(db.state(50))
                    .to.be.an('object')
                    .to.eql({'moon': 'super', 'sun': 'spotty', 'weather': 'foggy'});
            });

            it('all the latest state changes prevail after last change (specific state)', function () {
                let db = this.db;
                expect(db.state(51, 'weather'))
                    .to.be.an('string')
                    .to.eql('foggy');
                expect(db.state(51, 'sun'))
                    .to.be.an('string')
                    .to.eql('spotty');
                expect(db.state(51, 'moon'))
                    .to.be.an('string')
                    .to.eql('super');
            });

            it('all the latest state changes prevail after last change (all states)', function () {
                let db = this.db;
                expect(db.state(51))
                    .to.be.an('object')
                    .to.eql({'moon': 'super', 'sun': 'spotty', 'weather': 'foggy'});
            });

        });

        describe('state_detail', () => {

            it('returns null to first state before first change (specified state)', function () {
                let db = this.db;
                expect(db.state_detail(0, 'weather'))
                    .to.eql({'from': null, 'to': {'timestamp': 10, 'name': 'weather', 'val': 'raining'}});
                expect(db.state_detail(1, 'moon'))
                    .to.eql({'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}});
            });

            it('returns null to null before first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state_detail(0, 'missing'))
                    .to.eql({'from': null, 'to': null});
            });

            it('returns null to first state of all states before first change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(0))
                    .to.eql([
                        {'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}},
                        {'from': null, 'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': null, 'to': {'timestamp': 10, 'name': 'weather', 'val': 'raining'}},
                    ]);
                expect(db.state_detail(1))
                    .to.eql([
                        {'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}},
                        {'from': null, 'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': null, 'to': {'timestamp': 10, 'name': 'weather', 'val': 'raining'}},
                    ]);
            });

            it('returns first to second state at first change (specified state)', function () {
                let db = this.db;
                expect(db.state_detail(10, 'weather'))
                    .to.eql({'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                             'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}});
            });

            it('returns null to null at first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state_detail(10, '404'))
                    .to.eql({'from': null, 'to': null});
            });

            it('returns null to first state at first change (specified different state)', function () {
                let db = this.db;
                expect(db.state_detail(10, 'moon'))
                    .to.eql({'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}});
            });

            it('returns first to second state after first change (specified state)', function () {
                let db = this.db;
                expect(db.state_detail(11, 'weather'))
                    .to.eql({'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                             'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}});
            });

            it('returns null to null after first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state_detail(11, '404'))
                    .to.eql({'from': null, 'to': null});
            });

            it('returns null to first state after first change (specified different state)', function () {
                let db = this.db;
                expect(db.state_detail(11, 'moon'))
                    .to.eql({'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}});
            });

            it('reflects first change at first change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(10))
                    .to.eql([
                        {'from': null,
                         'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                         'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                    ]);
            });

            it('reflects first change after first change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(11))
                    .to.eql([
                        {'from': null,
                         'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                         'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                    ]);
            });

            it('reflects first and second change at second change', function () {
                let db = this.db;
                expect(db.state_detail(15))
                    .to.eql([
                        {'from': {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                         'to': {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                         'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                    ]);
            });

            it('reflects first and second change after second change', function () {
                let db = this.db;
                expect(db.state_detail(17))
                    .to.eql([
                        {'from': {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                         'to': {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                         'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                    ]);
            });

            it('new changes of state replace previous changes at new change (specified state)', function () {
                let db = this.db;
                expect(db.state_detail(20, 'weather'))
                    .to.eql({'from': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
                             'to': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}});
            });

            it('new changes of state replace previous changes after new change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(21))
                    .to.eql([
                        {'from': {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                         'to': {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
                         'to': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}},
                    ]);
            });

            it('last state to null prevails at last change (specific state)', function () {
                let db = this.db;
                expect(db.state_detail(50, 'weather'))
                    .to.eql({'from': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'to': null});
                expect(db.state_detail(50, 'sun'))
                    .to.eql({'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null});
                expect(db.state_detail(50, 'moon'))
                    .to.eql({'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null});
            });

            it('last state to null prevails at last change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(50))
                    .to.eql([
                        {'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null},
                        {'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null},
                        {'from': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'to': null},
                    ]);
            });

            it('last state to null prevails after last change (specific state)', function () {
                let db = this.db;
                expect(db.state_detail(51, 'weather'))
                    .to.eql({'from': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'to': null});
                expect(db.state_detail(51, 'sun'))
                    .to.eql({'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null});
                expect(db.state_detail(51, 'moon'))
                    .to.eql({'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null});
            });

            it('last state to null prevails after last change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(51))
                    .to.eql([
                        {'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null},
                        {'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null},
                        {'from': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'to': null},
                    ]);
            });

            it('returns null if all its changes are quashed', function () {
                let db = this.db;
                db.add_change('weather', null, 10);
                db.add_change('weather', null, 20);
                db.add_change('weather', null, 30);
                expect(db.state_detail(0, 'weather')).to.eql(null);
                expect(db.state_detail(5, 'weather')).to.eql(null);
                expect(db.state_detail(15, 'weather')).to.eql(null);
                expect(db.state_detail(25, 'weather')).to.eql(null);
                expect(db.state_detail(35, 'weather')).to.eql(null);
            });

            it('state is ommitted if all its changes are quashed', function () {
                let db = this.db;
                db.add_change('weather', null, 10);
                db.add_change('weather', null, 20);
                db.add_change('weather', null, 30);
                expect(db.state_detail(0).weather).to.eql(undefined);
                expect(db.state_detail(5).weather).to.eql(undefined);
                expect(db.state_detail(15).weather).to.eql(undefined);
                expect(db.state_detail(25).weather).to.eql(undefined);
                expect(db.state_detail(35).weather).to.eql(undefined);
                expect(db.state_detail(51))
                    .to.eql([
                        {'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null},
                        {'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null},
                    ]);
            });

        });

    });

});
