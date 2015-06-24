var handlebars = require('handlebars'),
	read = require('fs').readFileSync,
  swag = require('./test/minimal/swagger.json');

var config = {
    'assertionFormat':'should',
    'pathNames':['/', '/user'],
    'testmodules':'supertest'
  };

/**
 * Builds a unit test stubs for the response code of a path's operation
 * @param  {json}
 * @param  {string}
 * @param  {string}
 * @param  {string}
 * @param  {json}
 * @return {string}
 */
function testGenResponse(swagger, path, operation, response, config){
  var result, gen, source,
    // request payload
    data = {
      //'path':path,
      'responseCode':response,
      'description':swagger.paths[path][operation]['responses'][response].description,
      'assertion':config.assertionFormat
    };

  // adding body parameters to payload
  if (swagger.paths[path][operation].hasOwnProperty('parameters')){
    data.parameters = [];

    // only adds body parameters to request
    for (var param in swagger.paths[path][operation]['parameters'])
      if (swagger.paths[path][operation]['parameters'][param].in == 'body')
        data.parameters.push(swagger.paths[path][operation]['parameters'][param]);
  }

  // request url vs. supertest path
  if (config.testmodules == 'request'){
    data.url = swagger.schemes[0]+"://"+swagger.host+
    (swagger.basePath != undefined?swagger.basePath:"")+path;
  }
  else
    data.path = (swagger.basePath != undefined?swagger.basePath:"")+path

  // template source decision logic
  if (operation == 'get'){
    if (!data.hasOwnProperty('parameters') || data.parameters.length == 0){
      source = read('./templates/'+config.testmodules
        +'/get/get.handlebars','utf8');
    }    
  }
  else if (operation == 'post'){
    source = read('./templates/'+config.testmodules
      +'/post/post.handlebars', 'utf8');
  }
  else if (operation == 'put')
    console.log("----------- "+operation+" ------------")
  else if (operation == 'delete')
    console.log("----------- "+operation+" ------------")

  // compile template source and return test string
  gen = handlebars.compile(source);
  result = gen(data);

  return result;
}

/**
 * Builds a set of unit test stubsfor all response codes of a 
 *  path's operation
 * @param  {json}
 * @param  {string}
 * @param  {string}
 * @param  {json}
 * @return {string}
 */
function testGenOperation(swagger, path, operation, config){
  var responses = swagger.paths[path][operation]['responses'],
    result = [];

  for (res in responses){
    result.push(testGenResponse(swagger, 
      path, 
      operation, 
      res, 
      config));
  }

  var output = "describe('"+operation+"', function(){\n";
  for (test in result)
    output+=result[test]

  output+="});\n"

  return output;
}

/**
 * Builds a set of unit test stubs for all of a path's operations
 * @param  {json}
 * @param  {string}
 * @param  {json}
 * @return {string}
 */
function testGenPath(swagger, path, config){
  var operations = swagger.paths[path],
    result = [];

  for (op in operations){
    result.push(testGenOperation(swagger, path, op, config));
  }

  var output = "describe('"+path+"', function(){\n";
  for (test in result)
    output+=result[test]

  output+="});\n";

  return output;
}

/**
 * Builds unit test stubs for all paths specified by the configuration
 * @param  {json}
 * @param  {json}
 * @return {string}
 */
function testGen(swagger, config){
	var paths = swagger['paths'],
    targets = config.pathNames,
		result = [];

  if (config.pathNames.length == 0)
    for (var path in paths)
      result.push(testGenPath(swagger, path, config));

	//loops over specified paths
	for (var path in targets)
    if (paths.hasOwnProperty(targets[path]))
      result.push(testGenPath(swagger, targets[path], config));

  var output = "describe('"+swagger.info.title+"', function(){\n";
  for (test in result)
    output+=result[test]

  output+="});\n";

  console.log(output);
  return output;
}

/**
 * @author doginthehat
 * https://gist.github.com/doginthehat/1890659
 */
handlebars.registerHelper('compare', function(lvalue, rvalue, options) {
 
  if (arguments.length < 3)
    throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

  var operator = options.hash.operator || "==";
  
  var operators = {
    '==':   function(l,r) { return l == r; },
    '===':  function(l,r) { return l === r; },
    '!=':   function(l,r) { return l != r; },
    '<':    function(l,r) { return l < r; },
    '>':    function(l,r) { return l > r; },
    '<=':   function(l,r) { return l <= r; },
    '>=':   function(l,r) { return l >= r; },
    'typeof': function(l,r) { return typeof l == r; }
  }

  if (!operators[operator])
    throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

  var result = operators[operator](lvalue,rvalue);

  if( result )
    return options.fn(this);
  else 
    return options.inverse(this);
  
});

testGen(swag, config);