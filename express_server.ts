const bodyParser = require('body-parser');
let token;
    
// takes express app
function appInit( app, http_server_config, socketFuncts ){
    //token = http_server_config; // token is not in this data
    
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use((req, res, next)=>{
        console.info("new request "+req.url);
        next();
    })

    app.use('/version',(req, res, next)=>{
        let obj:any = {
            "node_version":process.version
        };
        obj = {"result":"nice try...but yeah, its running"};
        res.json(obj);
    });
    
    app.use('/v1/*',async (req, res, next)=>{

        let incoming_token = req.body.token || req.query.token;

        let toSend = {
            "connection":{
                preferedResponseName:null
            },
            "request":{},
            "errors":{}, // put app the error happened in
            "date":new Date()
        };

        http_server_config.keepArr.forEach((cur, i, arr)=>{
            toSend.request[cur] = req[cur];
        });

        let promiseResult:any = await new Promise((resolve, reject)=>{

            let preferedResponseName = toSend.connection.preferedResponseName;
            let preferedResponseIndex = 0;

            socketFuncts.sendToSockets(toSend, incoming_token).then((data)=>{

                if( preferedResponseName ){
                    // TODO pull index for prefered name
                    // preferedResponseIndex = 0;
                }

                if( typeof data[0] === "string"  ){// TODO do better than picking the first element
                    resolve({
                        "result":data[0],
                        "type":"string"
                    });
                }else{
                    resolve({
                        "result":data,
                        "type":"object"
                    });
                }  
            });

            setTimeout(() => {
                resolve({"error":"waiting on websocket return timeout"}); // prob make this better
            }, http_server_config.timeout);

        });

        if( promiseResult.type === "string" ){

            res.end(promiseResult.result);

        }else if( promiseResult.type === "object" ){

            try{
                res.json(promiseResult.result);
            }catch(e){
                console.error(e);
            }
        }
        
        
    })

    // this must be last
    app.use((req, res, next)=>{
        res.status(400).json({"error":"command not understood"});
    })

    console.log('appInit done')

    return app;
}

console.log("express server done")

export default appInit;