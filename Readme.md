# Breve

A film site. Home is the full catalog. This week is a short ordered program. People can watch without an account. Creators sign in to upload, publish, and revise the weekly list.

React and Vite on the client. Express and MongoDB on the server. Film files and images are stored on Cloudinary. Auth tokens stay in httpOnly cookies.

## What a visitor can do

- Browse every published film on Home, load more, and search by title, maker, place, or description. A result shows the phrase around the matched word.
- Narrow Home by length: under 15 seconds, 15 to 30 seconds, or over 30 seconds. Place and year appear once a film has those credits. "This week only" shows the current program in bill order.
- Open This week for the posted program: a title, a note, a total runtime, and up to eight films in order.
- Play a film. The page shows runtime, picture size, and codec taken from the file. A view counts once per person, after 30 seconds or a quarter of the film, whichever comes first. If the film is in this week, the next title in the bill is shown beside it.
- Read Notes without signing in. Posting, editing, and deleting a note requires an account, and only the author can edit or delete.

## What a signed-in creator can do

- Register with an avatar. Cover image is optional.
- Sign in. The access and refresh tokens are httpOnly cookies (`Secure`, `SameSite=None`). Axios refreshes the access cookie once when a request returns 401.
- Upload a film up to 500 MB. The server reads duration, width, height, and codec from the file and refuses a file it cannot read. A thumbnail is optional: leave it empty and the poster is a frame from a chosen second. An optional WebVTT file becomes a captions track. Cloudinary's free plan often refuses a file over 100 MB even though the app allows 500 MB.
- Set maker, place, year, and a rights line on upload, or later on the film page.
- Hide a film from the dashboard. Guests then get a not-found page. The owner can still open it.
- Revise this week's bill, like and comment, subscribe, save playlists, and read watch history.

## Security

- Helmet headers.
- 300 requests per 15 minutes on the API, and 20 per 15 minutes on register, login, refresh, and password change.
- express-validator on register, login, comments, notes, and the film title.
- Multer accepts images, videos, and `.vtt` captions. Other types are refused.
- Only the owner can edit or delete a film, comment, note, or playlist.

## Run it locally

Use two terminals. Node 18 or newer. `npm start` is not the client command.

```bash
cd server
npm install
npm run dev
```

The API listens on port 2001. `server/.env` needs:

```env
PORT=2001
MONGODB_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net
DB_NAME=Mega_project
CORS_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=<your-secret>
ACCESS_TOKEN_ENTRY=1d
REFRESH_TOKEN_SECRET=<your-secret>
REFRESH_TOKEN_ENTRY=10d
CLOUDINARY_CLOUD_NAME=<your-cloud>
CLOUDINARY_API_KEY=<your-key>
CLOUDINARY_API_SECRET=<your-secret>
```

```bash
cd client
npm install
npm run dev
```

The site is at http://localhost:5173/. The client calls `http://localhost:2001/api/v1` unless `client/.env` sets `VITE_API_BASE_URL`.

Server tests:

```bash
cd server
npm test
```

Those checks cover published-vs-hidden films, a second view, the weekly bill order, and the search and length helpers.

## Stack

| Piece | Role |
| --- | --- |
| React 19, Vite 8, React Router 7 | Pages |
| Axios | API calls, cookie refresh |
| Express 5, Mongoose 8 | API and data |
| JWT, bcrypt | Session |
| Cloudinary, Multer | Film, image, and caption files |
| Helmet, express-rate-limit, express-validator | Headers, limits, input checks |

Temp uploads go to the operating system's temp directory, then to Cloudinary.

## Routes worth knowing

| Page | Who |
| --- | --- |
| `/` | Everyone. Full catalog. |
| `/week` | Everyone. The posted program. |
| `/bill` | The person who posted the program. |
| `/video/:id` | Everyone for a published film. Owner only if it is unpublished. |
| `/tweets` | Everyone can read. An account is required to post. |
| `/upload`, `/dashboard`, `/history`, `/liked`, `/settings`, `/subscriptions` | Account required. |

### Programs — `/api/v1/programs`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/current` | No | The published bill, in order |
| POST | `/` | Yes | Post or revise that bill. At most eight published films. Only the current owner can replace it. |

### Videos — `/api/v1/videos`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | No | Published films. `query`, `length` (`under15`, `mid`, `over30`), `place`, `year`, `week=current` |
| GET | `/facets` | No | Places, years, and length bands that exist |
| POST | `/` | Yes | Upload. Probe the file. Thumbnail or a poster second. Optional captions. |
| GET | `/:videoId` | Optional | Film, credits, like and subscribe state, next title this week |
| POST | `/:videoId/view` | Optional | Body `{ watchedSeconds }`. Counts once, after the watch threshold |
| PATCH | `/:videoId` | Yes | Owner edits text, credits, thumbnail, or captions |
| DELETE | `/:videoId` | Yes | Owner delete, including stored files |
| PATCH | `/toggle/publish/:videoId` | Yes | Owner publishes or hides |

### Notes — `/api/v1/tweets`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | Optional | Public feed |
| GET | `/user/:userId` | Optional | One person's notes |
| POST | `/` | Yes | Create, 280 characters max |
| PATCH | `/:tweetId` | Yes | Author only |
| DELETE | `/:tweetId` | Yes | Author only |

Users, comments, likes, subscriptions, playlists, dashboard, and healthcheck live under `/api/v1/` in the same shape: public reads where a guest can see them, and owner checks on writes.

## Deploy

Backend on Render, frontend on Vercel. Set `CORS_ORIGIN` to the frontend origin and `VITE_API_BASE_URL` to the API origin. The auth cookies are already `Secure` and `SameSite=None`.

## License

MIT. See [Licence](Licence).
