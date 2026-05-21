const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const dotenv = require("dotenv")
dotenv.config();

const port = process.env.PORT
const uri = process.env.MONGO_URI

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    const db = client.db("petnest");
    const petCollection = db.collection("pets")

    app.get("/pets", async(req, res)=>{
      const result = await petCollection.find().toArray();
      res.send(result)
    })

    app.get("/featured", async(req, res)=>{
      const result = await petCollection.find().limit(6).toArray();
      res.send(result)
    })

    app.get("/pets/:petId", async(req, res)=> {
      const {petId} = req.params;
      const result = await petCollection.findOne({_id: new ObjectId(petId)});
      res.send(result);

    })
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})