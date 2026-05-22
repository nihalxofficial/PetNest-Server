const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const port = process.env.PORT;
const uri = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("petnest");
    const petCollection = db.collection("pets");
    const userCollection = db.collection("user");
    const adoptionCollection = db.collection("adoptions");

    app.get("/pets", async (req, res) => {
      const { search, species, fee, sort } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { species: { $regex: search, $options: "i" } },
          { breed: { $regex: search, $options: "i" } },
        ];
      }

      if (species) {
        query.species = { $regex: species, $options: "i" };
      }

      if (fee) {
        query.fee = { $lte: parseInt(fee) };
      }

      const sortQuery = 
          sort === "price_low"  ? { fee: 1 } :
          sort === "price_high" ? { fee: -1 } :
          sort === "name_asc"   ? { name: 1 } :
          sort === "name_desc"  ? { name: -1 } : {};


      const result = await petCollection.find(query).sort(sortQuery).toArray();
      res.send(result);
    });

    app.get("/featured", async (req, res) => {
      const result = await petCollection.find().limit(6).toArray();
      res.send(result);
    });

    app.get("/pets/:petId", async (req, res) => {
      const { petId } = req.params;
      const result = await petCollection.findOne({ _id: new ObjectId(petId) });
      res.send(result);
    });

    app.post("/pets", async (req, res) => {
      const pet = req.body;
      const result = await petCollection.insertOne(pet);
      res.send(result);
    });

    app.patch("/pets/:petId", async (req, res) => {
      const { petId } = req.params;
      const pet = req.body;
      const result = await petCollection.updateOne(
        { _id: new ObjectId(petId) },
        { $set: pet },
      );
      res.send(result);
    });

    app.delete("/pets/:petId", async (req, res) => {
      const { petId } = req.params;
      const result = await petCollection.deleteOne({
        _id: new ObjectId(petId),
      });
      res.send(result);
    });


    app.get("/users/:userId", async(req, res)=>{
      const {userId} = req.params;
      const result = await userCollection.findOne({_id: new ObjectId(userId)})
      res.send(result);
    })

    app.get("/adoptions", async(req,res)=>{
      const result = await adoptionCollection.find().toArray();
      res.send(result);
    })

    app.post("/adoptions/:petId", async(req,res)=> {
      const {petId} = req.params;
      const adoption = req.body
      await petCollection.updateOne({_id:new ObjectId(petId)}, {$set: {status: "adopting"}});
      const result = await adoptionCollection.insertOne(adoption);
      res.send(result)
    })

  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
