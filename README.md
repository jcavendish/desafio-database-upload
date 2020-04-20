# desafio-database-upload
Code challenge from GoStack bootcamp by Rocketseat. 

Students were given the following challenge: 
https://github.com/Rocketseat/bootcamp-gostack-desafios/tree/master/desafio-database-upload

## Blocking point
The hardest part of this challenge was to implement the import functionality, it was the first time I had the opportunity to work with streams in NodeJS.

The fact that I had to mix file upload, streams, parsing asynchronous operations in one unique feature made me do some research
and learn important concepts, especially when using streams. 

I was using streams events to handle calls to the database and using the asynchronous result to fill my response array. The effect was that
the stream was receiving data and emitting the end event before my calls were released from the event loop, and so, 
my response array was returning empty.

## Solution
After going through some docs of node streams I found this topic which helped me to understand better how streams and its flows work:
https://www.freecodecamp.org/news/node-js-streams-everything-you-need-to-know-c9141306be93/

Then I adjusted my code for instead of using events, pipe a transformation stram that creates a side effect to parse the object, save in the DB and send this object through only when the async result was returned.
In the end, instead of using the on 'end' listener, I used on 'finish' which states that the write stream is finished receiving the data, resolving a promise that now involves the whole stream operation.

Check out the solution here: 
https://github.com/jcavendish/desafio-database-upload/blob/master/src/services/ImportTransactionsService.ts

