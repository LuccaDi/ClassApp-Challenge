import express, { json } from 'express';
import fs from 'fs';
import path from 'path';

// const app = express();

// app.use(express.json());

//const data = ;

//console.log(getData());

// app.get('/', (request, response) => {
//     return response.json({message: getData()});
//     //return response.json({message: 'asd'});
// });

function main(){
    fs.readFile(path.join(__dirname, './input1.csv'), 'utf8', (error, data) => {
        const content = data.split('\n');
        console.log(content);
        return content;
    })
}

main();

// app.listen(3334);

