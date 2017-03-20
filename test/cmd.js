
const assert = require('assert');
const exec = require('child_process').exec;
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const request = require('supertest');
const rimraf = require('rimraf');
const spawn = require('child_process').spawn;
const validateNpmName = require('validate-npm-package-name')

const binPath = path.resolve(__dirname, '../bin/koa2');
// const TEMP_DIR = path.resolve(__dirname, '..', 'temp', String(process.pid + Math.random()))
const TEMP_DIR = path.resolve(__dirname, '..', 'temp')

describe('koa2', function () {
  before(function (done) {
    this.timeout(30000);
    cleanup(done);
  });

  /*after(function (done) {
    this.timeout(30000);
    cleanup(done);
  });*/

  describe('(no args)', function () {
    console.log(this.fullTitle())
    const ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app', function (done) {
      runRaw(ctx.dir, [], function (err, code, stdout, stderr) {
        if (err) return done(err);
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        ctx.stderr = stderr
        ctx.stdout = stdout
        assert.equal(ctx.files.length, 24)
        done();
      });
    });

    it('should provide debug instructions', function () {
      assert.ok(/DEBUG=koa2\-\(no-args\):\* (?:\& )?npm start/.test(ctx.stdout))
    });

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('app.js'), -1)
      assert.notEqual(ctx.files.indexOf('package.json'), -1)
      assert.notEqual(ctx.files.indexOf('routes/index.js'), -1)
    });

    it('should have nunjucks templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.njk'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.njk'), -1)
      assert.notEqual(ctx.files.indexOf('views/layout.njk'), -1)
    });

    it('should have a package.json file', function () {
      const file = path.resolve(ctx.dir, 'package.json');
      const contents = fs.readFileSync(file, 'utf8');
      assert.equal(contents, '{\n'
        + '  "name": "koa2-(no-args)",\n'
        + '  "version": "0.1.0",\n'
        + '  "private": true,\n'
        + '  "scripts": {\n'
        + '    "start": "node app.js"\n'
        + '  },\n'
        + '  "dependencies": {\n'
        + '    "debug": "~2.6.3",\n'
        + '    "koa": "^2.2.0",\n'
        + '    "koa-bodyparser": "^4.1.0",\n'
        + '    "koa-convert": "^1.2.0",\n'
        + '    "koa-json": "^2.0.2",\n'
        + '    "koa-logger": "^2.0.1",\n'
        + '    "koa-onerror": "^3.1.0",\n'
        + '    "koa-router": "^7.0.0",\n'
        + '    "koa-static": "^3.0.0",\n'
        + '    "koa-views": "^6.0.1",\n'
        + '    "nunjucks": "~3.0.0"\n'
        + '  },\n'
        + '  "devDependencies": {\n'
        + '    "babel-eslint": "7.1.1",\n'
        + '    "eslint": "3.18.0"\n'
        + '  }\n'
        + '}\n');
    });

    it('should have installable dependencies', function (done) {
      this.timeout(50000);
      npmInstall(ctx.dir, done);
    });

    it('should export an koa2 app from app.js', function () {
      const file = path.resolve(ctx.dir, 'app.js');
      const app = require(file);
      assert.equal(typeof app, 'object');
    });

    it('should respond to HTTP request', function (done) {
      const file = path.resolve(ctx.dir, 'app.js');
      const app = require(file);

      request(app)
      .get('/')
      .expect(200, /<title>Koa2<\/title>/, done);
    });

    it('should generate a 404', function (done) {
      var file = path.resolve(ctx.dir, 'app.js');
      var app = require(file);

      request(app)
      .get('/does_not_exist')
      .expect(404, /Not\ Found/, done);
    });

    describe('when directory contains spaces', function () {
      var ctx = setupTestEnvironment('foo bar (BAZ!)')

      it('should create basic app', function (done) {
        run(ctx.dir, [], function (err, output) {
          if (err) return done(err)
          assert.equal(parseCreatedFiles(output, ctx.dir).length, 24)
          done()
        })
      })

      it('should have a valid npm package name', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var name = JSON.parse(contents).name
        assert.ok(validateNpmName(name).validForNewPackages)
        assert.equal(name, 'foo-bar-(baz!)')
      })
    })

    describe('when directory is not a valid name', function () {
      var ctx = setupTestEnvironment('_')

      it('should create basic app', function (done) {
        run(ctx.dir, [], function (err, output) {
          if (err) return done(err)
          assert.equal(parseCreatedFiles(output, ctx.dir).length, 24)
          done()
        })
      })

      it('should default to name "hello-world"', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var name = JSON.parse(contents).name
        assert.ok(validateNpmName(name).validForNewPackages)
        assert.equal(name, 'hello-world')
      })
    })
  });

  describe('(unknown args)', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should exit with code 1', function (done) {
      runRaw(ctx.dir, ['--foo'], function (err, code, stdout, stderr) {
        if (err) return done(err);
        assert.strictEqual(code, 1);
        done();
      });
    });

    it('should print usage', function (done) {
      runRaw(ctx.dir, ['--foo'], function (err, code, stdout, stderr) {
        if (err) return done(err);
        assert.ok(/Usage: koa2/.test(stdout));
        assert.ok(/--help/.test(stdout));
        assert.ok(/--version/.test(stdout));
        assert.ok(/error: unknown option/.test(stderr));
        done();
      });
    });

    it('should print unknown option', function (done) {
      runRaw(ctx.dir, ['--foo'], function (err, code, stdout, stderr) {
        if (err) return done(err);
        assert.ok(/error: unknown option/.test(stderr));
        done();
      });
    });
  });

  describe('--css <engine>', function () {
    describe('(no engine)', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should exit with code 1', function (done) {
        runRaw(ctx.dir, ['--css'], function (err, code, stdout, stderr) {
          if (err) return done(err);
          assert.strictEqual(code, 1);
          done();
        });
      });

      it('should print usage', function (done) {
        runRaw(ctx.dir, ['--css'], function (err, code, stdout) {
          if (err) return done(err);
          assert.ok(/Usage: koa2/.test(stdout));
          assert.ok(/--help/.test(stdout));
          assert.ok(/--version/.test(stdout));
          done();
        });
      });

      it('should print argument missing', function (done) {
        runRaw(ctx.dir, ['--css'], function (err, code, stdout, stderr) {
          if (err) return done(err);
          assert.ok(/error: option .* argument missing/.test(stderr));
          done();
        });
      });
    });

    describe('less', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with less files', function (done) {
        run(ctx.dir, ['--css', 'less'], function (err, stdout) {
          if (err) return done(err);
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, 24, 'should have 24 files')
          done();
        });
      });

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
        assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
        assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
      });

      it('should have less files', function () {
        assert.notEqual(ctx.files.indexOf('public/stylesheets/style.less'), -1, 'should have style.less file')
      });

      it('should have installable dependencies', function (done) {
        this.timeout(30000);
        npmInstall(ctx.dir, done);
      });

      it('should export an koa2 app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);
        assert.equal(typeof app, 'object');
      });

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);

        request(app)
        .get('/')
        .expect(200, /<title>koa2<\/title>/, done);
      });

      it('should respond with stylesheet', function (done) {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);

        request(app)
        .get('/stylesheets/style.css')
        .expect(200, /sans-serif/, done);
      });
    });

    describe('stylus', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with stylus files', function (done) {
        run(ctx.dir, ['--css', 'stylus'], function (err, stdout) {
          if (err) return done(err);
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, 24, 'should have 24 files')
          done();
        });
      });

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
        assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
        assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
      });

      it('should have stylus files', function () {
        assert.notEqual(ctx.files.indexOf('public/stylesheets/style.styl'), -1, 'should have style.styl file')
      });

      it('should have installable dependencies', function (done) {
        this.timeout(30000);
        npmInstall(ctx.dir, done);
      });

      it('should export an koa2 app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);
        assert.equal(typeof app, 'object');
      });

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);

        request(app)
        .get('/')
        .expect(200, /<title>koa2<\/title>/, done);
      });

      it('should respond with stylesheet', function (done) {
        var file = path.resolve(ctx.dir, 'app.js');
        var app = require(file);

        request(app)
        .get('/stylesheets/style.css')
        .expect(200, /sans-serif/, done);
      });
    });
  });

  describe('--ejs', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with ejs templates', function (done) {
      run(ctx.dir, ['--ejs'], function (err, stdout) {
        if (err) return done(err);
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        assert.equal(ctx.files.length, 16, 'should have 16 files')
        done();
      });
    });

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
      assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
      assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
    });

    it('should have ejs templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.ejs'), -1, 'should have views/error.ejs file')
      assert.notEqual(ctx.files.indexOf('views/index.ejs'), -1, 'should have views/index.ejs file')
    });
  });

  describe('--git', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with git files', function (done) {
      run(ctx.dir, ['--git'], function (err, stdout) {
        if (err) return done(err);
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        assert.equal(ctx.files.length, 18, 'should have 18 files')
        done();
      });
    });

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
      assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
      assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
    });

    it('should have .gitignore', function () {
      assert.notEqual(ctx.files.indexOf('.gitignore'), -1, 'should have .gitignore file')
    });

    it('should have jade templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.jade'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.jade'), -1)
      assert.notEqual(ctx.files.indexOf('views/layout.jade'), -1)
    });
  });

  describe('-h', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should print usage', function (done) {
      run(ctx.dir, ['-h'], function (err, stdout) {
        if (err) return done(err);
        var files = parseCreatedFiles(stdout, ctx.dir);
        assert.equal(files.length, 0);
        assert.ok(/Usage: koa2/.test(stdout));
        assert.ok(/--help/.test(stdout));
        assert.ok(/--version/.test(stdout));
        done();
      });
    });
  });

  describe('--hbs', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with hbs templates', function (done) {
      run(ctx.dir, ['--hbs'], function (err, stdout) {
        if (err) return done(err);
        ctx.files = parseCreatedFiles(stdout, ctx.dir);
        assert.equal(ctx.files.length, 24);
        done();
      });
    });

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1)
      assert.notEqual(ctx.files.indexOf('app.js'), -1)
      assert.notEqual(ctx.files.indexOf('package.json'), -1)
    });

    it('should have hbs in package dependencies', function () {
      var file = path.resolve(ctx.dir, 'package.json');
      var contents = fs.readFileSync(file, 'utf8');
      var dependencies = JSON.parse(contents).dependencies;
      assert.ok(typeof dependencies.hbs === 'string');
    });

    it('should have hbs templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.hbs'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.hbs'), -1)
      assert.notEqual(ctx.files.indexOf('views/layout.hbs'), -1)
    });
  });

  describe('--help', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should print usage', function (done) {
      run(ctx.dir, ['--help'], function (err, stdout) {
        if (err) return done(err);
        var files = parseCreatedFiles(stdout, ctx.dir);
        assert.equal(files.length, 0);
        assert.ok(/Usage: koa2/.test(stdout));
        assert.ok(/--help/.test(stdout));
        assert.ok(/--version/.test(stdout));
        done();
      });
    });
  });

  describe('--hogan', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with hogan templates', function (done) {
      run(ctx.dir, ['--hogan'], function (err, stdout) {
        if (err) return done(err)
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        assert.equal(ctx.files.length, 16)
        done()
      })
    })

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1)
      assert.notEqual(ctx.files.indexOf('app.js'), -1)
      assert.notEqual(ctx.files.indexOf('package.json'), -1)
    })

    it('should have hjs in package dependencies', function () {
      var file = path.resolve(ctx.dir, 'package.json')
      var contents = fs.readFileSync(file, 'utf8')
      var dependencies = JSON.parse(contents).dependencies
      assert.ok(typeof dependencies.hjs === 'string')
    })

    it('should have hjs templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.hjs'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.hjs'), -1)
    })
  })

  describe('--pug', function () {
    var ctx = setupTestEnvironment(this.fullTitle())

    it('should create basic app with pug templates', function (done) {
      run(ctx.dir, ['--pug'], function (err, stdout) {
        if (err) return done(err)
        ctx.files = parseCreatedFiles(stdout, ctx.dir)
        assert.equal(ctx.files.length, 24)
        done()
      })
    })

    it('should have basic files', function () {
      assert.notEqual(ctx.files.indexOf('bin/www'), -1)
      assert.notEqual(ctx.files.indexOf('app.js'), -1)
      assert.notEqual(ctx.files.indexOf('package.json'), -1)
    })

    it('should have pug in package dependencies', function () {
      var file = path.resolve(ctx.dir, 'package.json')
      var contents = fs.readFileSync(file, 'utf8')
      var dependencies = JSON.parse(contents).dependencies
      assert.ok(typeof dependencies.pug === 'string')
    })

    it('should have pug templates', function () {
      assert.notEqual(ctx.files.indexOf('views/error.pug'), -1)
      assert.notEqual(ctx.files.indexOf('views/index.pug'), -1)
      assert.notEqual(ctx.files.indexOf('views/layout.pug'), -1)
    })
  })

  describe('--view <engine>', function () {
    describe('(no engine)', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should exit with code 1', function (done) {
        runRaw(ctx.dir, ['--view'], function (err, code, stdout, stderr) {
          if (err) return done(err)
          assert.strictEqual(code, 1)
          done()
        })
      })

      it('should print usage', function (done) {
        runRaw(ctx.dir, ['--view'], function (err, code, stdout) {
          if (err) return done(err)
          assert.ok(/Usage: koa2/.test(stdout))
          assert.ok(/--help/.test(stdout))
          assert.ok(/--version/.test(stdout))
          done()
        })
      })

      it('should print argument missing', function (done) {
        runRaw(ctx.dir, ['--view'], function (err, code, stdout, stderr) {
          if (err) return done(err)
          assert.ok(/error: option .* argument missing/.test(stderr))
          done()
        })
      })
    })

    describe('ejs', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with ejs templates', function (done) {
        run(ctx.dir, ['--view', 'ejs'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, 16, 'should have 16 files')
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1, 'should have bin/www file')
        assert.notEqual(ctx.files.indexOf('app.js'), -1, 'should have app.js file')
        assert.notEqual(ctx.files.indexOf('package.json'), -1, 'should have package.json file')
      })

      it('should have ejs templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.ejs'), -1, 'should have views/error.ejs file')
        assert.notEqual(ctx.files.indexOf('views/index.ejs'), -1, 'should have views/index.ejs file')
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an koa2 app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'object')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/')
        .expect(200, /<title>koa2<\/title>/, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/does_not_exist')
        .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('hbs', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with hbs templates', function (done) {
        run(ctx.dir, ['--view', 'hbs'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, 24)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have hbs in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.hbs === 'string')
      })

      it('should have hbs templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.hbs'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.hbs'), -1)
        assert.notEqual(ctx.files.indexOf('views/layout.hbs'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an koa2 app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'object')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/')
        .expect(200, /<title>koa2<\/title>/, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/does_not_exist')
        .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('hjs', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with hogan templates', function (done) {
        run(ctx.dir, ['--view', 'hjs'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, 16)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have hjs in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.hjs === 'string')
      })

      it('should have hjs templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.hjs'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.hjs'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an koa2 app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'object')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        // the "hjs" module has a global leak
        this.runnable().globals('renderPartials')

        request(app)
        .get('/')
        .expect(200, /<title>koa2<\/title>/, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/does_not_exist')
        .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('pug', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with pug templates', function (done) {
        run(ctx.dir, ['--view', 'pug'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, 24)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have pug in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.pug === 'string')
      })

      it('should have pug templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.pug'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.pug'), -1)
        assert.notEqual(ctx.files.indexOf('views/layout.pug'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an koa2 app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'object')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/')
        .expect(200, /<title>koa2<\/title>/, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/does_not_exist')
        .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('twig', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with twig templates', function (done) {
        run(ctx.dir, ['--view', 'twig'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, 24)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have twig in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.twig === 'string')
      })

      it('should have twig templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.twig'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.twig'), -1)
        assert.notEqual(ctx.files.indexOf('views/layout.twig'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an koa2 app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'object')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/')
        .expect(200, /<title>koa2<\/title>/, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/does_not_exist')
        .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })

    describe('vash', function () {
      var ctx = setupTestEnvironment(this.fullTitle())

      it('should create basic app with vash templates', function (done) {
        run(ctx.dir, ['--view', 'vash'], function (err, stdout) {
          if (err) return done(err)
          ctx.files = parseCreatedFiles(stdout, ctx.dir)
          assert.equal(ctx.files.length, 24)
          done()
        })
      })

      it('should have basic files', function () {
        assert.notEqual(ctx.files.indexOf('bin/www'), -1)
        assert.notEqual(ctx.files.indexOf('app.js'), -1)
        assert.notEqual(ctx.files.indexOf('package.json'), -1)
      })

      it('should have vash in package dependencies', function () {
        var file = path.resolve(ctx.dir, 'package.json')
        var contents = fs.readFileSync(file, 'utf8')
        var dependencies = JSON.parse(contents).dependencies
        assert.ok(typeof dependencies.vash === 'string')
      })

      it('should have vash templates', function () {
        assert.notEqual(ctx.files.indexOf('views/error.vash'), -1)
        assert.notEqual(ctx.files.indexOf('views/index.vash'), -1)
        assert.notEqual(ctx.files.indexOf('views/layout.vash'), -1)
      })

      it('should have installable dependencies', function (done) {
        this.timeout(30000)
        npmInstall(ctx.dir, done)
      })

      it('should export an koa2 app from app.js', function () {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)
        assert.equal(typeof app, 'object')
      })

      it('should respond to HTTP request', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/')
        .expect(200, /<title>koa2<\/title>/, done)
      })

      it('should generate a 404', function (done) {
        var file = path.resolve(ctx.dir, 'app.js')
        var app = require(file)

        request(app)
        .get('/does_not_exist')
        .expect(404, /<h1>Not Found<\/h1>/, done)
      })
    })
  })
});

function cleanup(dir, callback) {
  if (typeof dir === 'function') {
    callback = dir;
    dir = TEMP_DIR;
  }

  rimraf(dir, function (err) {
    callback(err);
  });
}

function npmInstall(dir, callback) {
  var env = Object.create(null)

  // copy the environment except for "undefined" strings
  for (var key in process.env) {
    if (process.env[key] !== 'undefined') {
      env[key] = process.env[key]
    }
  }
  exec('yarn install', {cwd: dir, env: env}, function (err, stderr) {
    if (err) {
      err.message += stderr;
      callback(err);
      return;
    }

    callback();
  });
}

function parseCreatedFiles(output, dir) {
  var files = [];
  var lines = output.split(/[\r\n]+/);
  var match;

  for (var i = 0; i < lines.length; i++) {
    if ((match = /create.*?: (.*)$/.exec(lines[i]))) {
      var file = match[1];

      if (dir) {
        file = path.resolve(dir, file);
        file = path.relative(dir, file);
      }

      file = file.replace(/\\/g, '/');
      files.push(file);
    }
  }

  return files;
}

function run(dir, args, callback) {
  runRaw(dir, args, function (err, code, stdout, stderr) {
    if (err) {
      return callback(err);
    }

    process.stderr.write(stripWarnings(stderr))

    try {
      assert.equal(stripWarnings(stderr), '')
      assert.strictEqual(code, 0);
    } catch (e) {
      return callback(e);
    }

    callback(null, stripColors(stdout))
  });
}

function runRaw(dir, args, callback) {
  var argv = [binPath].concat(args);
  var exec = process.argv[0];
  var stderr = '';
  var stdout = '';

  var child = spawn(exec, argv, {
    cwd: dir
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', function ondata(str) {
    stdout += str;
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', function ondata(str) {
    stderr += str;
  });

  child.on('close', onclose);
  child.on('error', callback);

  function onclose(code) {
    callback(null, code, stdout, stderr);
  }
}

function setupTestEnvironment (name) {
  var ctx = {}

  before('create environment', function (done) {
    ctx.dir = path.join(TEMP_DIR, name.replace(/[<>]/g, ''))
    mkdirp(ctx.dir, done)
  })

  /*after('cleanup environment', function (done) {
    this.timeout(30000)
    cleanup(ctx.dir, done)
  })*/

  return ctx
}

function stripColors (str) {
  return str.replace(/\x1b\[(\d+)m/g, '_color_$1_')
}

function stripWarnings (str) {
  return str.replace(/\n(?:  warning: [^\n]+\n)+\n/g, '')
}
