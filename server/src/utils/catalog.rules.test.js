import test from "node:test"
import assert from "node:assert/strict"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import { MongoMemoryServer } from "mongodb-memory-server"
import request from "supertest"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { Program } from "../models/program.model.js"

let mongod
let app
let ownerToken
let published
let hidden
let follow

const film = (owner, fields) => Video.create({
    videofile: "https://example.com/film.mp4",
    thumbnail: "https://example.com/poster.jpg",
    owner,
    views: 0,
    isPublish: true,
    duration: 8,
    ...fields
})

test.before(async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
    ;({ app } = await import("../app.js"))

    const owner = await User.create({
        username: "editor",
        email: "editor@example.com",
        fullname: "Editor",
        avatar: "https://example.com/avatar.jpg",
        password: "password12"
    })
    ownerToken = jwt.sign({ _id: owner._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" })

    published = await film(owner._id, { title: "Tide line", description: "Coast at dusk" })
    follow = await film(owner._id, { title: "One tree", description: "A single tree" })
    hidden = await film(owner._id, { title: "Unreleased reel", isPublish: false })

    await Program.create({
        title: "Water, timber, night",
        note: "Coast first.",
        status: "published",
        owner: owner._id,
        slots: [
            { video: follow._id, position: 2 },
            { video: published._id, position: 1 }
        ]
    })
})

test.after(async () => {
    await mongoose.disconnect()
    if (mongod) await mongod.stop()
})

test("signed-out visitors only receive published films", async () => {
    const list = await request(app).get("/api/v1/videos")
    assert.equal(list.status, 200)
    const titles = list.body.data.docs.map((doc) => doc.title)
    assert.ok(titles.includes("Tide line"))
    assert.equal(titles.includes("Unreleased reel"), false)

    const missed = await request(app).get(`/api/v1/videos/${hidden._id}`)
    assert.equal(missed.status, 404)
})

test("the owner can open an unpublished film", async () => {
    const opened = await request(app)
        .get(`/api/v1/videos/${hidden._id}`)
        .set("Authorization", `Bearer ${ownerToken}`)
    assert.equal(opened.status, 200)
    assert.equal(opened.body.data.title, "Unreleased reel")
})

test("a second view does not increment", async () => {
    const early = await request(app)
        .post(`/api/v1/videos/${published._id}/view`)
        .send({ watchedSeconds: 0.2 })
    assert.equal(early.status, 200)
    assert.equal(early.body.data.counted, false)

    const first = await request(app)
        .post(`/api/v1/videos/${published._id}/view`)
        .send({ watchedSeconds: 3 })
    assert.equal(first.body.data.counted, true)
    assert.equal(first.body.data.views, 1)

    const second = await request(app)
        .post(`/api/v1/videos/${published._id}/view`)
        .send({ watchedSeconds: 8 })
    assert.equal(second.body.data.counted, false)
    assert.equal(second.body.data.views, 1)
})

test("the published bill stays in order", async () => {
    const bill = await request(app).get("/api/v1/programs/current")
    assert.equal(bill.status, 200)
    assert.deepEqual(
        bill.body.data.films.map((item) => item.title),
        ["Tide line", "One tree"]
    )
    assert.equal(bill.body.data.films[0].position, 1)
    assert.equal(bill.body.data.films[1].position, 2)

    const opened = await request(app).get(`/api/v1/videos/${published._id}`)
    assert.equal(opened.body.data.nextInWeek.title, "One tree")
})
