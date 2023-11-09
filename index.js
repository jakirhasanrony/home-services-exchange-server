const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    // "https://home-services-exchange.web.app",
    // "https://home-services-exchange.firebaseapp.com",
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1ez7hhm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
const logger = (req, res, next) => {
  console.log(('log info: '), req.method, req.url);
  next();
}


const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  // console.log('token in the middleware', token);
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  // next();
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })

}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();



    const serviceCollection = client.db('homeServicesExchange').collection('services');
    const bookedCollection = client.db('homeServicesExchange').collection('bookings');

    // auth related api
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      console.log('user for token:', user);
      const token = jwt.sign(user,
        process.env.ACCESS_SECRET_TOKEN,
        { expiresIn: '1h' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
        .send({ success: true });

    })


    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true });

    })





    // service related
    app.post('/services', async (req, res) => {
      const newService = req.body;
      console.log(newService);
      const result = await serviceCollection.insertOne(newService);
      res.send(result);

    })

    app.delete('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.deleteOne(query);
      res.send(result);


    })

    app.get('/added-services', async (req, res) => {
      // console.log(req.query.service_provider_email);
      let query = {};
      if (req.query?.service_provider_email) {
        query = { service_provider_email: req.query.service_provider_email }
      }
      const result = await serviceCollection.find(query).toArray();
      res.send(result);
    })

    app.put('/services/:id', async (req, res) => {
      const id = req.params.id;
      const updatedService = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const service = {
        $set: {
          service_name: updatedService.service_name,
          service_area: updatedService.service_area,
          service_description: updatedService.service_description,
          service_provider_img: updatedService.service_provider_img,
          service_provider_email: updatedService.service_provider_email,
          service_price: updatedService.service_price,
          service_image: updatedService.service_image,
          service_provider_name: updatedService.service_provider_name
        }
      }

      const result = await serviceCollection.updateOne(filter, service, options);
      res.send(result);
    })


    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.findOne(query);
      res.send(result)

    })



    // bookings
    app.post('/bookings', async (req, res) => {
      const bookedService = req.body;
      // console.log(bookedService);
      const result = await bookedCollection.insertOne(bookedService);
      res.send(result);

    })

    app.get('/bookings', logger, verifyToken, async (req, res) => {
      // console.log(req.query.email);
      console.log('token owner:', req.user);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: 'forbidden access' })

      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookedCollection.find(query).toArray();
      res.send(result);
    })


    app.get('/other-bookings', async (req, res) => {
      // console.log(req.query.service_provider_email);
      let query = {};
      if (req.query?.service_provider_email) {
        query = { service_provider_email: req.query.service_provider_email }
      }
      const result = await bookedCollection.find(query).toArray();
      res.send(result);
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);










app.get('/', (req, res) => {
  res.send('home services is coming...')
})

app.listen(port, () => {
  console.log(`home service server is running on port: ${port}`);
})