'use strict';

const process = require('process');
const opentelemetry = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const {
  diag,
  trace,
  context,
  DiagConsoleLogger,
  DiagLogLevel,
} = require('@opentelemetry/api');
// const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
// const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const exporter = new OTLPTraceExporter({
    url: 'http://34.71.61.249:4317/v1/traces',
  // headers: {
  //   foo: 'bar'
  // },
  // concurrencyLimit: 1,
});

const sdk = new opentelemetry.NodeSDK({
  traceExporter: exporter,
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'app-server',
  }),
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-dns': {
      enabled: false,
    },
    // load custom configuration for http instrumentation
    '@opentelemetry/instrumentation-http': {
      applyCustomAttributesOnSpan: (span) => {
        const httpUrl = span.attributes && span.attributes['http.url'];
        const httpTarget = span.attributes && span.attributes['http.target'];
        if ((httpTarget && httpTarget.startsWith('/zss/api/v1')) ||
             (httpUrl && httpUrl.startsWith('https://vm30101.svl.ibm.com:7557/'))) {
          // custom attributes
          span.setAttribute('zowe.component', 'zss');
        }
      },
    },
  })]
});

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start()
  .then(() => console.log('Tracing initialized'))
  .catch((error) => console.log('Error initializing tracing', error));

// gracefully shut down the SDK on process exit
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error));
      // .finally(() => process.exit(0));
  });
});