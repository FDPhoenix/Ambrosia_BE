const swaggerAutogen = require('swagger-autogen')();
const dotenv = require('dotenv');
const outputFile = './swagger-output.json';
const endpointsFiles = [
  '../App.js',
  '../routes/*.js',
];

dotenv.config({});

const doc = {
  info: {
    title: 'Ambrosia API Documentation',
    description: 'Documentation for Express.js API',
    version: '1.0.0',
  },
  host: process.env.SWAGGER_URL,
  schemes: ['http'],
};

swaggerAutogen(outputFile, endpointsFiles, doc);