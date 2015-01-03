const { Duplex } = require('stream');
const through = require('through2');
const asap = require('asap');
const Remutable = require('remutable');
const { Patch } = Remutable;

const Client = require('./Client');

const INT_MAX = 9007199254740992;

class Server extends Duplex {
  constructor() {
    this._stores = {};
    this._actions = {};
    this._publish = null;
    this.on('data', this._receive);

    if(__DEV__) {
      asap(() => {
        try {
          this._publish.should.be.a.Function;
        }
        catch(err) {
          console.warn(`Server#use(publish) should be called immediatly after instanciation.`);
        }
      });
    }
  }

  use(publish) {
    if(__DEV__) {
      publish.should.be.a.Function;
    }
    this._publish = publish;
    return this;
  }

  Link(link = new Duplex()) {
    if(__DEV__) {
      link.should.have.property('pipe').which.is.a.Function;
    }
    const subscriptions = {};
    const clientID = null;

    link.pipe(through.obj((ev, enc, done) => { // filter & pipe client events to the server
      if(__DEV__) {
        ev.should.be.an.instanceOf(Client.Event);
      }

      if(ev instanceof Client.Event.Open) {
        clientID = ev.clientID;
        return done(null, { clientID, ev });
      }
      if(ev instanceof Client.Event.Close) {
        clientID = null;
        return done(null, { clientID, ev });
      }
      if(ev instanceof Client.Event.Subscribe) {
        subscriptions[ev.path] = true;
        return done(null);
      }
      if(ev instanceof Client.Event.Unsubscribe) {
        if(subscriptions[ev.path]) {
          delete subscriptions[ev.path];
        }
        return done(null);
      }
      if(ev instanceof Client.Event.Dispatch) {
        if(clientID !== null) {
          return done(null, { clientID, ev });
        }
        return done(null);
      }
      return done(new TypeError(`Unknown Client.Event: ${ev}`));
    }))
    .pipe(this);

    this.pipe(through.obj((ev, enc, done) => { // filter & pipe server events to the client
      if(__DEV__) {
        ev.should.be.an.instanceOf(Server.Event);
      }

      if(ev instanceof Server.Event.Update) {
        if(subscriptions[ev.path]) {
          return done(null, ev);
        }
        return done(null);
      }
      if(ev instanceof Server.Event.Delete) {
        if(subscriptions[ev.path]) {
          return done(null, ev);
        }
        return done(null);
      }
      return done(new TypeError(`Unknown Server.Event: ${ev}`));
    })
    .pipe(link);

    return link;
  }

  _send(ev) {
    if(__DEV__) {
      ev.should.be.an.instanceOf(Server.Event);
    }
    this.write(ev);
  }

  _receive({ clientID, ev }) {
    if(__DEV__) {
      clientID.should.be.a.String;
      ev.should.be.an.instanceOf(Client.Event);
    }
  }

  Store(path, lifespan) {
    if(__DEV__) {
      path.should.be.a.String;
    }

    const { engine } = this._stores[path] || (() => {
      const engine = new Store.Engine();
      return this._stores[path] = {
        engine,
        consumer: engine.createConsumer()
        .onUpdate((consumer, patch) => {
          this._publish(path, consumer);
          this._send(new Server.Event.Update({ path, patch }));
        })
        .onDelete(() => this._send(new Server.Event.Delete({ path }))),
      };
    })();
    const producer = engine.createProducer();
    producer.lifespan.then(() => {
      if(engine.producers === 0) {
        engine.release();
        delete this._stores[path];
      }
    });
    lifespan.then(producer.release);
    return producer;
  }

  Action(path, lifespan) {
    if(__DEV__) {
      path.should.be.a.String;
    }

    const { engine } = this._actions[path] || (() => {
      const engine = new Action.Engine();
      return this._actions[path] = {
        engine,
        producer: engine.createProducer(),
      };
    });
    const consumer = engine.createConsumer();
    consumer.lifespan.then(() => {
      if(engine.consumers === 0) {
        engine.release();
        delete this._actions[path];
      }
    });
    lifespan.then(consumer.release);
    return consumer;
  }
}

class Event {
  constructor() {
    if(__DEV__) {
      this.should.have.property('toJS').which.is.a.Function;
      this.constructor.should.have.property('fromJS').which.is.a.Function;
    }
    Object.assign(this, {
      _json: null,
      _js: null,
    });
  }

  toJS() {
    if(this._js === null) {
      this._js = {
        t: this.constructor.t(),
        j: this._toJS(),
      };
    }
    return this._js;
  }

  toJSON() {
    if(this._json === null) {
      this._json = JSON.stringify(this.toJS());
    }
    return this._json;
  }

  static fromJSON(json) {
    const { t, j } = JSON.parse(json);
    return Events._[t].fromJS(j);
  }
}

class Update extends Event {
  constructor(path, patch) {
    if(__DEV__) {
      path.should.be.a.String;
      patch.should.be.an.instanceOf(Patch);
    }
    super();
    Object.assign(this, { path, patch });
  }

  _toJS() {
    return {
      p: this.path,
      u: this.patch.toJS(),
    };
  }

  static t() {
    return 'u';
  }

  static fromJS({ p, u }) {
    if(__DEV__) {
      p.should.be.a.String;
      u.should.be.an.Object;
    }
    return new Update(p, Patch.fromJS(u));
  }
}

class Delete extends Event {
  constructor(path) {
    if(__DEV__) {
      path.should.be.a.String;
    }
    super();
    Object.assign(this, { path });
  }

  _toJS() {
    return { p: this.patch };
  }

  static t() {
    return 'd';
  }

  static fromJS({ p }) {
    if(__DEV__) {
      p.should.be.a.String;
    }
    return new Delete(p);
  }
}

Events.Update = Events._[Update.t()] = Update;
Events.Delete = Events._[Event.t()] = Delete;

Server.Events = Events;

module.exports = Server;
