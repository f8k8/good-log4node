'use strict';

var Stream = require('stream');
var Hoek = require('hoek');
var Stringify = require('json-stringify-safe');
	
class Log4NodeStream extends Stream.Writable {
	constructor(options) {
		super({objectMode: true});
		
		var defaults = {
			logLevels: {
				errorLevel: 'error',
				opsLevel: 'notice',
				requestLevel: 'notice',
				responseLevel: 'notice',
				logLevel: 'notice',
				otherLevel: 'info'
			}
		};
		
		if (options == null) {
		  options = {};
		}
		var settings = Hoek.applyToDefaults(defaults, options);
		
		this.logger = options.log || require('log4node');
		this.logLevels = settings.logLevels;
	}
	
	_formatResponse(event) {
		var query = event.query ? Stringify(event.query) : '';
		var responsePayload = '';
		if (event.responsePayload && typeof event.responsePayload === 'object') {
			responsePayload = 'Response payload: ' + Stringify(event.responsePayload);
		}
		return `${event.instance}: ${event.method} ${event.path} ${query} ${event.statusCode} ${event.responseTime}ms ${responsePayload}`;
	};
	
	_write(chunk, enc, next) {
    	
		// Get the event type
		var event = chunk;
		var eventType = event.event;
		var output;
		var logLevel;
		switch(eventType)
		{
			case 'response':
				logLevel = this.logLevels.responseLevel;
				output = this._formatResponse(event);
				break;
		
			case 'ops':
				logLevel = this.logLevels.opsLevel;
				output = `Memory: ${Math.round(event.proc.mem.rss / (1024 * 1024))}Mb, Uptime (seconds): ${event.proc.uptime}, Load: ${event.os.load}`;
				break;
				
			case 'error':
				logLevel = this.logLevels.errorLevel;
				output = 'Message: ' + event.error.message + '\nStack: ' + event.error.stack;
				break;
			
			case 'request':
				logLevel = this.logLevels.requestLevel;
                output = 'Data: ' + (typeof event.data === 'object' ? Stringify(event.data) : event.data);
				break;
				
			case 'log':
				logLevel = this.logLevels.logLevel;
				output = 'Data: ' + (typeof event.data === 'object' ? Stringify(event.data) : event.data);
				break;
			
			default:
				// Handle exceptions
				if(event instanceof Error)
				{
					output = event;
					logLevel = this.logLevels.errorLevel;
				}
				else
				{
					if (event.data) {
						output = 'Data: ' + (typeof event.data === 'object' ? Stringify(event.data) : event.data);
					} else {
						output = 'Event: ' + eventType;
					}
					logLevel = this.logLevels.otherLevel;
				}
				break;
		}
		
		// Get the log type
		if(output)
        {
            // Override log level based on tags present
            if (event.tags)
            {
                var logLevelTags = [
                    'emergency',
                    'alert',
                    'critical',
                    'error',
                    'warning',
                    'notice',
                    'info',
                    'debug'
                ];
                for (var levelTagIndex = 0; levelTagIndex < logLevelTags.length; ++levelTagIndex)
                {
                    if (event.tags.indexOf(logLevelTags[levelTagIndex]) !== -1)
                    {
                        logLevel = logLevelTags[levelTagIndex];
                        break;
                    }
                }
            }

			if(!logLevel)
			{
				logLevel = this.logLevels.otherLevel;
			}
        
            this.logger[logLevel](output);
		}
		
		next();
	}
}

module.exports = Log4NodeStream;