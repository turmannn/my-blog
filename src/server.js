import express, { application } from 'express';
import { MongoClient } from 'mongodb';
import path from 'path';

const app = express();

app.use(express.static(path.join(__dirname, 'build')));
app.use(express.json())

const withDb = async (dbOperations, res) => {
    try {
        // const articleInfo = await getArticleFromMongo(req.params.name);
        const connection = await MongoClient.connect('mongodb://localhost:27017');
        console.log('Connected successfully to mongodb server')
        const db = await connection.db('my-blog')

        await dbOperations(db);

        connection.close(); // if error happens here then response 500 will fail because response has already been sent during dbOperations() realier. // TODO: figure out a solution.
    } catch (e) {
        console.log('error!: ', e)
        res.status(500).json({ message: 'Error connecting to db', error: e.message});
    }
}

app.get('/api/articles/:name', async (req, res) => {
    await withDb(async (db) => {
        const articleInfo = await db.
            collection('articles').
            findOne({ name: req.params.name });

        res.status(200).json(articleInfo);
    }, res)
})

app.post('/api/article/:name/upvote', async (req, res) => {
    await withDb(async db => {
        const articleName = req.params.name
        const articles = db.collection('articles')
        const articleInfo = await articles.findOne({ name: articleName });
        await articles.updateOne(
            { name: articleName },
            { '$set': { upvotes: articleInfo.upvotes + 1 } }
        );
        const updateArticleInfo = await articles.findOne({ name: articleName });
        res.status(200).json(updateArticleInfo);
    }, res)
})

app.post('/api/article/:name/add-comment', (req, res) => {
    const articleName = req.params.name;
    const { text, username} = req.body;
    withDb(async db => {
        const articles = db.collection('articles')
        const articleInfo = await articles.findOne({ name: articleName });
        await articles.updateOne(
          { name: articleName},
          // { '$set': { comments: articleInfo.comments.concat({ text, username }) } }
          { '$set': {
              comments: [...articleInfo.comments, { text, username }]
          }}
        )
        const updatedArticleInfo = await articles.findOne({ name: articleName });
        res.status(200).json(updatedArticleInfo);
    }, res)
})

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
})

const port = 8000
app.listen(port, () => console.log(`Listening on port ${port}`));