const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;
  const token = authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const JWKS = createRemoteJWKSet(
      new URL(process.env.CLIENT_URL + "/api/auth/jwks"),
    );
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    // console.log(payload);
    next();
  } catch (error) {
    console.error("Token validation failed:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

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
        const speciesList = species.split(",").map((s) => s.trim());
        query.species = { $in: speciesList.map((s) => new RegExp(s, "i")) };
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

    app.get("/pets/:petId", verifyToken, async (req, res) => {
      const { petId } = req.params;
      if (!ObjectId.isValid(petId)) {
        return res.status(400).send({ error: "Invalid petId" });
      }
      const result = await petCollection.findOne({ _id: new ObjectId(petId) });
      res.send(result);
    });

    app.get("/listings/:userId", verifyToken, async (req, res) => {
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

    app.get("/users/:userId", verifyToken, async (req, res) => {
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

    app.get("/adoptions/:petId", verifyToken, async (req, res) => {
      const { petId } = req.params;
      const result = await adoptionCollection.find({ petId: petId }).toArray();
      res.send(result);
    });

    app.post("/adoptions/:petId", async (req, res) => {
      const { petId } = req.params;
      const adoption = req.body;

      const pet = await petCollection.findOne({ _id: new ObjectId(petId) });

      if (!pet) {
        return res.status(404).send({ message: "Pet not found." });
      }

      if (pet.ownerEmail === adoption.userEmail) {
        return res
          .status(403)
          .send({ message: "You cannot adopt your own pet." });
      }

      if (pet.status === "adopted") {
        return res
          .status(400)
          .send({ message: "This pet has already been adopted." });
      }

      const result = await adoptionCollection.insertOne(adoption);
      res.send(result);
    });

    app.patch("/adoptions/approve/:adoptionId", async (req, res) => {
      const { adoptionId } = req.params;

      const adoption = await adoptionCollection.findOne({
        _id: new ObjectId(adoptionId),
      });

      if (!adoption) {
        return res.status(404).send({ message: "Adoption request not found" });
      }

      const petId = adoption.petId;

      const pet = await petCollection.findOne({ _id: new ObjectId(petId) });
      if (pet.status === "adopted") {
        return res.status(400).send({ message: "Pet is already adopted" });
      }

      await adoptionCollection.updateOne(
        { _id: new ObjectId(adoptionId) },
        { $set: { status: "approved" } },
      );

      await adoptionCollection.updateMany(
        {
          petId: petId,
          _id: { $ne: new ObjectId(adoptionId) },
          status: "pending",
        },
        { $set: { status: "rejected" } },
      );

      const result = await petCollection.updateOne(
        { _id: new ObjectId(petId) },
        { $set: { status: "adopted" } },
      );

      res.send({ message: "Adoption approved successfully", result });
    });

    app.patch("/adoptions/reject/:adoptionId", async (req, res) => {
      const { adoptionId } = req.params;

      const result = await adoptionCollection.updateOne(
        { _id: new ObjectId(adoptionId) },
        { $set: { status: "rejected" } },
      );

      res.send({ message: "Adoption rejected", result });
    });

    app.delete("/adoptions/:id", async (req, res) => {
      const { id } = req.params;
      const result = await adoptionCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.get("/requests/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await adoptionCollection
        .find({ userId: userId })
        .toArray();
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
