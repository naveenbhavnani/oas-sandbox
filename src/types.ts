import { IncomingMessage, ServerResponse } from 'http';
import { Logger } from 'pino';

export interface OpenAPIDocument {
  openapi: string;
  info: any;
  servers?: any[];
  paths: Record<string, PathItem>;
  components?: Components;
  security?: SecurityRequirement[];
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
}

export interface PathItem {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  trace?: Operation;
  servers?: Server[];
  parameters?: (Parameter | Reference)[];
}

export interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocumentation;
  operationId?: string;
  parameters?: (Parameter | Reference)[];
  requestBody?: RequestBody | Reference;
  responses: Responses;
  callbacks?: Record<string, Callback | Reference>;
  deprecated?: boolean;
  security?: SecurityRequirement[];
  servers?: Server[];
}

export interface Components {
  schemas?: Record<string, Schema | Reference>;
  responses?: Record<string, Response | Reference>;
  parameters?: Record<string, Parameter | Reference>;
  examples?: Record<string, Example | Reference>;
  requestBodies?: Record<string, RequestBody | Reference>;
  headers?: Record<string, Header | Reference>;
  securitySchemes?: Record<string, SecurityScheme | Reference>;
  links?: Record<string, Link | Reference>;
  callbacks?: Record<string, Callback | Reference>;
}

export interface Reference {
  $ref: string;
}

export interface Schema {
  title?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
  type?: string;
  allOf?: (Schema | Reference)[];
  oneOf?: (Schema | Reference)[];
  anyOf?: (Schema | Reference)[];
  not?: Schema | Reference;
  items?: Schema | Reference;
  properties?: Record<string, Schema | Reference>;
  additionalProperties?: boolean | Schema | Reference;
  description?: string;
  format?: string;
  default?: any;
  nullable?: boolean;
  discriminator?: Discriminator;
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: XML;
  externalDocs?: ExternalDocumentation;
  example?: any;
  deprecated?: boolean;
  'x-sandbox'?: Record<string, any>;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: Schema | Reference;
  example?: any;
  examples?: Record<string, Example | Reference>;
  content?: Record<string, MediaType>;
}

export interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required?: boolean;
}

export interface Responses {
  [statusCode: string]: Response | Reference;
}

export interface Response {
  description: string;
  headers?: Record<string, Header | Reference>;
  content?: Record<string, MediaType>;
  links?: Record<string, Link | Reference>;
}

export interface MediaType {
  schema?: Schema | Reference;
  example?: any;
  examples?: Record<string, Example | Reference>;
  encoding?: Record<string, Encoding>;
}

export interface Header {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: Schema | Reference;
  example?: any;
  examples?: Record<string, Example | Reference>;
  content?: Record<string, MediaType>;
}

export interface Example {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface Server {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface Tag {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentation;
}

export interface ExternalDocumentation {
  description?: string;
  url: string;
}

export interface Discriminator {
  propertyName: string;
  mapping?: Record<string, string>;
}

export interface XML {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

export interface Encoding {
  contentType?: string;
  headers?: Record<string, Header | Reference>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface Link {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  server?: Server;
}

export interface Callback {
  [expression: string]: PathItem;
}

export interface ResolvedOperation {
  operationId: string;
  method: string;
  path: string;
  pathRegex: RegExp;
  paramNames: string[];
  operation: Operation;
  responses: Record<string, Response>;
  requestBodySchema?: Schema;
  parameters: Parameter[];
}

export interface ScenarioRule {
  when: ScenarioSelector;
  do: ScenarioAction[];
  priority?: number;
}

export interface ScenarioSelector {
  operationId?: string;
  method?: string;
  path?: string;
  match?: {
    query?: Record<string, string>;
    headers?: Record<string, string>;
  };
  negate?: boolean;
}

export type ScenarioAction = 
  | RespondAction
  | StateSetAction
  | StatePatchAction
  | StateIncrementAction
  | StateDelAction
  | DelayAction
  | IfAction
  | ProxyAction
  | EmitAction;

export interface RespondAction {
  respond: {
    status?: number;
    headers?: Record<string, any>;
    body?: any;
    $template?: boolean;
    $schema?: string;
    $example?: string;
  };
}

export interface StateSetAction {
  'state.set': {
    key: string;
    value: any;
    ttl?: number;
    scope?: 'session' | 'global';
  };
}

export interface StatePatchAction {
  'state.patch': {
    key: string;
    value: any;
    scope?: 'session' | 'global';
  };
}

export interface StateIncrementAction {
  'state.increment': {
    key: string;
    by?: number;
    as?: string;
    scope?: 'session' | 'global';
  };
}

export interface StateDelAction {
  'state.del': {
    key: string;
    scope?: 'session' | 'global';
  };
}

export interface DelayAction {
  delay: string | number;
}

export interface IfAction {
  if: {
    when: string;
    then: ScenarioAction[];
    else?: ScenarioAction[];
  };
}

export interface ProxyAction {
  proxy: {
    target?: string;
    passThroughHeaders?: string[];
    record?: 'always' | 'unmatched' | 'never';
    redact?: string[];
    onRecord?: string;
  };
}

export interface EmitAction {
  emit: {
    level: 'info' | 'warn' | 'error';
    message: string;
  };
}

export interface SandboxContext {
  req: SandboxRequest;
  res: SandboxResponse;
  operation: ResolvedOperation;
  session: SessionContext;
  state: StateAPI;
  schema: SchemaAPI;
  template: TemplateAPI;
  vars: Record<string, any>;
  logger: Logger;
}

export interface SandboxRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body: any;
  pathParams: Record<string, string>;
  raw: IncomingMessage;
}

export interface SandboxResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  raw: ServerResponse;
}

export interface SessionContext {
  id: string;
  scope: 'session' | 'global';
}

export interface StateAPI {
  get(key: string, options?: { scope?: 'session' | 'global' }): Promise<any>;
  set(key: string, value: any, options?: { ttl?: number; scope?: 'session' | 'global' }): Promise<void>;
  patch(key: string, value: any, options?: { scope?: 'session' | 'global' }): Promise<void>;
  increment(key: string, by?: number, options?: { scope?: 'session' | 'global' }): Promise<number>;
  del(key: string, options?: { scope?: 'session' | 'global' }): Promise<void>;
}

export interface SchemaAPI {
  validate(schema: Schema | Reference, data: any): { valid: boolean; errors?: any[] };
  generate(schema: Schema | Reference, options?: GenerateOptions): any;
}

export interface GenerateOptions {
  seed?: string;
  useExamples?: boolean;
}

export interface TemplateAPI {
  render(template: string, context: any): string;
  evaluate(expression: string, context: any): any;
}

export interface StateStore {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  increment(key: string, by: number): Promise<number>;
  patch(key: string, value: any): Promise<void>;
  close(): Promise<void>;
}

export interface SandboxOptions {
  oas: OpenAPIDocument | string;
  scenarios?: ScenarioRule[] | string;
  store?: StateStore | StoreConfig;
  chaos?: ChaosConfig;
  validate?: ValidationConfig;
  seed?: string;
  proxy?: ProxyConfig;
  logger?: Logger;
}

export interface StoreConfig {
  type: 'memory' | 'file' | 'redis';
  options?: any;
}

export interface ChaosConfig {
  latency?: string | number;
  errorRate?: number;
  bandwidth?: number;
}

export interface ValidationConfig {
  requests?: boolean;
  responses?: 'warn' | 'strict' | false;
}

export interface ProxyConfig {
  target: string;
  record?: 'always' | 'unmatched' | 'never';
  redact?: string[];
}

export interface Fixture {
  operationId: string;
  request: {
    method: string;
    path: string;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: any;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
  };
  timestamp: string;
  hash: string;
}

export interface SandboxServer {
  listen(port: number, host?: string): Promise<void>;
  close(): Promise<void>;
  fetch(request: Request): Promise<Response>;
}

export interface RequestMatch {
  operation: ResolvedOperation;
  params: Record<string, string>;
  scenarios: ScenarioRule[];
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';