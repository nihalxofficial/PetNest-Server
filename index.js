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
        sort === "price_low"
          ? { fee: 1 }
          : sort === "price_high"
            ? { fee: -1 }
            : sort === "name_asc"
              ? { name: 1 }
              : sort === "name_desc"
                ? { name: -1 }
                : {};

      const result = await petCollection.find(query).sort(sortQuery).toArray();
      res.send(result);
    });

    app.get("/featured", async (req, res) => {
      const result = await petCollection.find().limit(6).toArray();
      res.send(result);
    });

    app.get("/pets/:petId", async (req, res) => {
      const { petId } = req.params;
      if (!ObjectId.isValid(petId)) {
        return res.status(400).send({ error: "Invalid petId" });
      }
      const result = await petCollection.findOne({ _id: new ObjectId(petId) });
      res.send(result);
    });

    app.get("/listings/:userId", async (req, res) => {
      const { userId } = req.params;
      if (!ObjectId.isValid(userId)) {
        return res.status(400).send({ error: "Invalid userid" });
      }
      const result = await petCollection.find({ ownerID: userId }).toArray();
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

    app.get("/users/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await userCollection.findOne({
        _id: new ObjectId(userId),
      });
      res.send(result);
    });

    // app.get("/users", async (req, res) => {
    //   const { email } = req.query;
    //   const result = await userCollection.findOne({ email: email });
    //   res.send(result);
    // });

    app.get("/adoptions", async (req, res) => {
      const result = await adoptionCollection.find().toArray();
      res.send(result);
    });

    app.get("/adoptions/:petId", async (req, res) => {
      const { petId } = req.params;
      const result = await adoptionCollection.find({ petId: petId }).toArray();
      res.send(result);
    });

    app.post("/adoptions/:petId", async (req, res) => {
      const { petId } = req.params;
      const adoption = req.body;
      const result = await adoptionCollection.insertOne(adoption);
      res.send(result);
    });

    // APPROVE - needs both petId and adoptionId
    app.patch("/adoptions/approve/:adoptionId", async (req, res) => {
      const { adoptionId } = req.params;

      // 1. Find the adoption request first
      const adoption = await adoptionCollection.findOne({
        _id: new ObjectId(adoptionId),
      });

      if (!adoption) {
        return res.status(404).send({ message: "Adoption request not found" });
      }

      const petId = adoption.petId;

      // 2. Check if pet is still available
      const pet = await petCollection.findOne({ _id: new ObjectId(petId) });
      if (pet.status === "adopted") {
        return res.status(400).send({ message: "Pet is already adopted" });
      }

      // 3. Approve this specific request
      await adoptionCollection.updateOne(
        { _id: new ObjectId(adoptionId) },
        { $set: { status: "approved" } },
      );

      // 4. Reject ALL other pending requests for this pet
      await adoptionCollection.updateMany(
        {
          petId: petId,
          _id: { $ne: new ObjectId(adoptionId) },
          status: "pending",
        },
        { $set: { status: "rejected" } },
      );
      // 5. Mark pet as adopted
      const result = await petCollection.updateOne(
        { _id: new ObjectId(petId) },
        { $set: { status: "adopted" } },
      );

      res.send({ message: "Adoption approved successfully", result });
    });

    // REJECT - only reject that specific request, don't touch pet status
    app.patch("/adoptions/reject/:adoptionId", async (req, res) => {
      const { adoptionId } = req.params;

      const result = await adoptionCollection.updateOne(
        { _id: new ObjectId(adoptionId) },
        { $set: { status: "rejected" } },
      );

      res.send({ message: "Adoption rejected", result });
    });


    app.get("/requests/:userId", async (req, res) => {
      const { userId } = req.params;
      console.log(userId);
      const result = await adoptionCollection.find({userId: userId}).toArray();
      console.log(result);
      res.send(result);
    });








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
