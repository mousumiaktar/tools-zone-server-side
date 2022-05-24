const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ayosb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'UnAuthorized access'});
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err,decoded){
        if(err){
           return res.status(403).send({message: 'Forbidden access'}) 
        }
        // console.log(decoded);
        req.decoded = decoded;
        next();
    })
}



async function run() {
    try{
        await client.connect();
        const toolCollection = client.db('toolShop').collection('tool');
        // order
        const orderCollection = client.db('toolShop').collection('orders');
        // user
        const userCollection = client.db('toolShop').collection('users');


        // TOOL============================================
        app.get('/tool', async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);
        })


        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const tool = await toolCollection.findOne(query)
            res.send(tool);
        })


        // ORDER=================================================
         // ORDER GET-----------
        app.get('/orders', verifyJWT, async (req, res) => {
            const customerEmail = req.query.email;
            const decodedEmail = req.decoded.email;
            if(customerEmail === decodedEmail){
                const query = {customerEmail: customerEmail}
                const order = await orderCollection.find(query).toArray();
                res.send(order);
            }
            else{
                return res.status(403).send({message: 'forbidden access'});
            }
        })


        // ORDER POST API------------
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
        });



        // user=======================================================
       
       app.get('/user', async(req, res)=>{
          const users = await userCollection.find().toArray();
          res.send(users);
       })

    //  getAdmin  ===================================================
       app.get('/admin/:email', async(req, res) => {
           const email = req.params.email;
           const result = await userCollection.findOne(email);
           const isAdmin = result.role === "admin";
           res.send({admin:isAdmin});
       })
       
       
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '12h' })
            res.send({ result, token });
          })


        //   ADMIN=======================================================
        app.put('/user/admin/:email',async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
              $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
          })



    }
    finally{

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server is running!');
  })
  
  app.listen(port, () => {
    console.log(`Listening to port ${port}`);
  })