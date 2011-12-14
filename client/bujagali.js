/*jslint evil:true */
/*globals document load fs $ log exports _ require */

/**
 * Bujagali
 *
 * The namespace that holds all the Bujagali magic. You may want to alias it
 * to something shorter and easier to type.
 **/
(function(root, factory) {
  // Set up Backbone appropriately for the environment.
  if (typeof exports !== 'undefined') {
    // Node/CommonJS, no need for jQuery in that case.
    factory(root, exports, require('underscore'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['underscore', 'exports'], function(_, exports) {
      factory(root, exports, _);
    });
  } else {
    // Browser globals
    root.Bujagali = factory(root, {}, root._);
  }
}(this, function(root, Bujagali, _) {

  /* ECMAScript 5!! */
  if (!Object.create) {
    Object.create = function(prototype) {
      function p() {}
      p.prototype = prototype;
      return new p();
    };
  }

  var headEl = (typeof document != 'undefined') ?
    document.getElementsByTagName("head")[0] :
    null;
  var pendingExec = {};

  var needNewVersion = function(v1, v2) {
    return v1 != v2;
  }

  if (root.__testing__) {
    needNewVersion = function() { return false };
  }

  /* escape regular expressions */
  var ampRe = /&/g;
  var ltRe = /</g;
  var gtRe = />/g;
  var aposRe = /'/g;
  var quoteRe = /"/g;

  /* iso regex */
  var isoRe = /([0-9]{4})(-([0-9]{2})(-([0-9]{2})(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?(Z|(([\-+])([0-9]{2}):([0-9]{2})))?)?)?)?/i;

  /* urlize regular expression */
  var urlMatcher = /[0-9A-z]\S+(\.com|\.org|\.net|\.edu|\.mil|\.gov|\.cc|\.me|\.cn|\.ly|\.io|\.fm|\.co|\.uk|\.ca|\.be|\.jp|\.pe|\.kr)(\/[0-9A-z\-_\.\?=&#\/;%:+(]+[0-9A-z\/])?/gi;

  var newLineRe = /\n/g;

  /**
   * Bujagali.Utils
   *
   * Utility functions made available to your templates.
   **/
  var utils = {
    /**
     * Bujagali.Utils.enrich(s) -> string
     * - s (string): A string to enrich
     *
     * This function takes a string, escapes it, urlizes it, and converts
     * newlines into <br /> tags. One stop shopping for spitting out user
     * provided content.
     *
     * Returns the enriched string.
     **/
    enrich: function(s) {
      s = utils.escape(s);
      s = utils.urlize(s);
      s = s.replace(newLineRe, '<br />');
      return s;
    },

    /**
     * Bujagali.Utils.urlize(s[, dontReplace]) -> string
     * - s (String): The string to urlize
     * - dontReplace (Array): An array of urls to ignore when urlizing.
     *
     * Looks for urls in `s` and replaces them with anchor tags. Returns the
     * new string.
     *
     * *Hint:*
     * If using this in combination with `Bujagali.Utils.escape`, you
     * should do this afterwards.
     **/
    urlize: function(s, dontReplace) {
      var matches = s.match(urlMatcher);
      if (!matches) { return s; }
      var output = '';
      var end;
      _.each(matches, function(link) {
        var replace = true;
        var prefix = 'http://';

        /* check against a list of safe urls. If it matches,
         * we don't want to urlize that particular url
         */
        if (dontReplace) {
          _.each(dontReplace, function(safe) {
            if (link.search(safe) != -1) {
              replace = false;
            }
          });
        }
        if (replace) {
          if (link.slice(0,4) == 'http') {
            prefix = '';
          }
          end = s.indexOf(link);
          output += s.slice(0, end);
          output += [
            '<a target="_blank" title = "', link, '" href="',
            prefix, link, '">',
            utils.truncate(link, 80), '</a>'
          ].join('');
          s = s.slice(end + link.length);
        }
      });
      output += s; // get the tail
      return output;
    },

    /**
     * Bujagali.Utils.randomID() -> number
     *
     * Returns a random integer between 0 and 10000000
     **/
    randomID: function() {
      return Math.floor(Math.random() * 10000000);
    },

    parseISODate: function(string, dontAdjustTimezone) {
      if (!string) { return 0; }

      var d = string.match(isoRe);
      if (!d) {
        return null;
      }
      var offset = 0;
      var date = new Date(d[1], 0, 1);

      if (d[3]) { date.setMonth(d[3] - 1); }
      if (d[5]) { date.setDate(d[5]); }
      if (d[7]) { date.setHours(d[7]); }
      if (d[8]) { date.setMinutes(d[8]); }
      if (d[10]) { date.setSeconds(d[10]); }
      if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
      if (d[14]) {
        offset = (Number(d[16]) * 60) + Number(d[17]);
        offset *= ((d[15] == '-') ? 1 : -1);
      }

      if (!dontAdjustTimezone) {
        offset -= date.getTimezoneOffset();
      }
      return (Number(date) + (offset * 60 * 1000));
    },

    /**
     * Bujagali.Utils.date(isoDate) -> Date
     * - isoDate (string): An iso date string
     *
     * Take an iso date string and returns a JavaScript date object representing
     * the same date and time.
     **/
    date: function(isoDate, ignoreTimezone) {
      if (!isoDate) { return isoDate; }

      var utc = utils.parseISODate(isoDate, ignoreTimezone);
      if (!utc) {
        return null;
      }
      var d = new Date();
      d.setTime(utc);
      return d;
    },

    /**
     * Bujagali.Utils.truncate(s, length) -> string
     * - s (string): The string to truncate
     * - length (number): Where to truncate the string
     *
     * Takes a string and returns a string that is the length specified, plus
     * an ellipsis if the original string was longer than the length. If the
     * original string's length is less that `length`, just return the original
     * string.
     **/
    truncate: function(s, length) {
      if (s.length > length) {
        s = s.slice(0, length - 1) + "&hellip;";
      }
      return s;
    },

    /**
     * Bujagali.Utils.capitalize(s) -> string
     * - s (string): The string to capitalize
     *
     * Capitalizes the first letter of every word in the
     * string and returns the result.
     **/
    capitalize: function(s) {
      return _.map(s.split(' '), function(sub) {
        return sub.charAt(0).toUpperCase() + sub.slice(1);
      }).join(' ');
    },

    /**
     * Bujagali.Utils.escape(str) -> string
     * - str (String): The string to escape.
     *
     * Takes the input string and replaces potentially dangerous text with
     * HTML entitites. For instance "<script>" becomes "&lt;script&gt;"
     *
     * Returns the escaped string.
     **/
    escape: function(str) {
      return str.replace(ampRe,'&amp;')
        .replace(ltRe,'&lt;')
        .replace(gtRe,'&gt;')
        .replace(aposRe, '&#39;')
        .replace(quoteRe, "&quot;");
    },

    /**
     * Bujagali.Utils.deEscape(str) -> string
     * - str (String): The string to deEscape
     *
     * Reverses Bujagali.Utils.escape
     *
     * Returns the de-escaped string.
     **/
    deEscape: function(str) {
      /* removes escaping performed by django filter 'escape' */
      if(!str) {
        return '';
      }
      var retval = str.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,'\'').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
      return retval;
    }
  };

  var helpers = Object.create(utils);

  /**
   * class Bujagali.Monad
   *
   * A Monad provides a binding between some data and a template.
   *
   * Monads are templates that are associated with data. They may have been
   * executed or they may be pending execution. This is the class that does the
   * magic: when you refer to `self` in a template, you are referring to your
   * Monad
   **/

  /**
   * new Bujagali.Monad(name[, context][, root])
   * - name (String): The name of the template to render
   * - context (Object): The context that provides the data and version
   *   of the template to render.
   * - root (String): The path to the root of the templates directory. If you
   *   are running in a browser, this is usually unnecessary.
   **/
  function Monad(name, data) {
    this.name = name;
    this.markup = [];
    this.data = data;
  }

  var module = {
    fxns: {}, // The actual template functions.
    helpers: helpers, // macros

    /**
     * Bujagali.render(name[, args]) -> Bujagali.Monad
     * - name (String): The name of a template to render.
     *
     *   This will create a new `Bujagali.Monad` and call render on it,
     *   passing the remaining arguments (after the name) to the
     *   `Bujagali.Monad.render` function. It is a shortcut function.
     **/
    render: function(name, data) {
      var inst = new Monad(name, data);
      return inst.render.call(inst);
    },
    /**
     * Bujagali.mixin(obj) -> undefined
     * - obj (Object): A new object to make available to templates.
     *
     * The properties provided in `obj` will be available under `Bujagali.Utils`
     * as well as in templates via `self`.
     **/
    mixin: function(obj) {
      _.extend(utils, obj);
    },
    Utils: utils,
    Monad: Monad
  };

  Monad.prototype = Object.create(helpers);
  _.extend(Monad.prototype, {
    ctor: Monad, // for subtemplates, and we overrode the proto one

    /**
     * Bujagali.Monad#render(context, args) -> undefined
     * - context (Object): The data provided to the template
     *
     * This is the function that does the magic. It loads the template and then
     * executes it with the provided context.
     **/
    render: function() {
      var template = module.fxns[this.name];
      template.call(this, this.data);
      return this.markup.join('');
    }
  });

  return module;
}));
