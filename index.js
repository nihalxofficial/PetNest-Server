const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const cors = require("cors")
const dotenv = require("dotenv")
dotenv.config();

const port = process.env.PORT
const uri = process.env.MONGO_URI

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const db = client.db("petnest");
    const petCollection = db.collection("pets")

    app.get("/pets", async(req, res)=>{
      const {search} = req.query;
      let result;
      if(search){
         result = await petCollection.find({$or:[
          {name: {$regex: search, $options:"i"}}, 
          {species: {$regex: search, $options:"i"}}, 
          {brand: {$regex: search, $options:"i"}}
        ]}).toArray();
      }
      else{
        result = await petCollection.find().toArray();
      }
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

    app.post("/pets", async(req, res)=>{
      const pet = req.body;
      const result = await petCollection.insertOne(pet);
      res.send(result);
    })

    app.patch("/pets/:petId", async(req,res)=>{
      const {petId} = req.params;
      const pet = req.body;
      const result = await petCollection.updateOne({_id: new ObjectId(petId)}, {$set: pet});
      res.send(result);
    })

    app.delete("/pets/:petId", async(req, res)=>{
      const {petId} = req.params;
      const result = await petCollection.deleteOne({_id: new ObjectId(petId)})
      res.send(result);
    })

  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})