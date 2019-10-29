
'use strict';

const express = require('express');
const bodyParser = require('body-parser');

require('dotenv').config();
const NutritionFetcher = require(__dirname + '/nutrition-fetcher');
const NF = new NutritionFetcher(process.env.USDA_NDB_API_KEY || 'DEMO_KEY');

const restService = express();

restService.use(bodyParser.urlencoded({extended: true}));
restService.use(bodyParser.json());

/**
 * Search for nutrtion facts for a give search term.
 * @param {String} searchTerm The search term.
 * @returns {Promise} promise
 */
function searchFoodItem(searchTerm) {
    return NF.searchFoods(searchTerm, 1).then(results => {
        if (!results) {
            return Promise.reject("No results found");
        }

        // Items are returned as a FoodItem instance
        // allowing you to call 'getNutritions' directly on the instance.
        return NF.getNutritions(results[0]).then(nutrition => Promise.resolve({searchTerm: searchTerm, nutritions: nutrition}));
    });
}


function submitAnswer(res, answer) {
    return res.json({
      fulfillmentText: answer,
      fulfillmentMessages: [
        {
          text: {
            text: [
              answer
            ],
          },
        },
        /*
          PAyload stuff added
        */
        {
          payload: {
            messages: [
              {
                type: "0",
                speech: "The bank offers a range of products categorised broadly into 2 categories: Banking and Loans. Click on the   product category you’d like to explore or ask me a question."
              },
              {
                type: "2",
                replies: [
                  "Banking",
                  "Loan"
                ]
              }
            ]
          }
        }
        /*
        PAyload ends
        */
      ],
      source: 'ankit-oct-2019',
    });
}
/*
"messages": [
  {
    "type": "0",
    "speech": "The bank offers a range of banking products categorised broadly into following categories,  Click on the product category you’d like to explore or ask me a question."
  },
  {
    "replies": [
      "Savings",
      "Checking"
    ],
    "type": "2"
  }
]
*/
/**
 * Randomize nutrient fact from a food item for sample usage
 * @param {FoodItem} foodItem
 * @param {String} answer Random nutrient fact
 */
function constructRandomNutrientFact(foodItem) {
    let randomNutrient = foodItem.nutritions[Math.floor(Math.random() * foodItem.nutritions.length)];
    return foodItem.searchTerm + " has " + randomNutrient.value + " " + randomNutrient.unit + " " + randomNutrient.name;
}

restService.post('/hook', function (req, res) {

    let bodyReq = req.body.queryResult;
    console.log('Got a new request: ', bodyReq)

    try {
        if (!bodyReq.parameters.product || bodyReq.parameters.product === 0) {
            submitAnswer(res, "Missing search terms.");
        }
        else {
            Promise.all(bodyReq.parameters.product.map(searchFoodItem))
                .then(results => {

                    let answer = '';

                    for (var index=0; index<results.length; index++) {
                        answer +=  constructRandomNutrientFact(results[index]);

                        if (index < results.length - 1) {
                            answer +=  "; ";
                        }
                    }

                    submitAnswer(res, answer);
                })
                .catch(err =>  {
                    console.log(err);
                    submitAnswer(res, "Error while processing the search. Please try again later.");
                });
        }
    } catch (err) {
        console.error("Can't process request", err);

        return res.status(400).json({
            status: {
                code: 400,
                errorType: err.message
            }
        });
    }
});

var listener = restService.listen((process.env.PORT || 5000), function() {
    console.log('Listening on port ' + listener.address().port);
});
