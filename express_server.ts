const bodyParser = require('body-parser');
let token;
    
// takes express app
function appInit( app, http_server_config, socketFuncts ){
    token = http_server_config;
    
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use((req, res, next)=>{
        console.info("new request "+req.url);
        next();
    })

    app.use('/version',(req, res, next)=>{
        res.end(process.version);
    });
    
    app.use('/v1/*',async (req, res, next)=>{

        let incoming_token = req.body.token || req.query.token;

        let toSend = {
            "connection":{},
            "request":{},
            "errors":{}, // put app the error happened in
            "date":new Date()
        };

        http_server_config.keepArr.forEach((cur, i, arr)=>{
            toSend.request[cur] = req[cur];
        });

        let jsonResponse = await new Promise((resolve, reject)=>{

            socketFuncts.sendToSockets(toSend, incoming_token).then((data)=>{   
                resolve(data);
            });

            setTimeout(() => {
                resolve({"error":"waiting on websocket return timeout"}); // prob make this better
            }, http_server_config.timeout);

        });
        
        try{
            res.json(jsonResponse);
        }catch(e){console.error(e);}
    })

    console.log('appInit done')

    return app;
}

console.log("express server done")

export default appInit;