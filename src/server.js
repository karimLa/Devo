import express from 'express'
import favicon from 'serve-favicon'
import helmet from 'helmet'
import featurePolicy from 'feature-policy'
import compression from 'compression'
import timeout from 'express-timeout-handler'
import { json } from 'body-parser'
import { connect } from 'mongoose'
import passport from 'passport'
import passportConfig from './config/passport'
import { join } from 'path'

// Development packages
import volleyball from 'volleyball'

// Load Routes
import index from './routes'
import notFound from './routes/notFound'
import { users, profile, posts } from './routes/api'
import { errorRespone } from './validation/ErrorHelper'

// ENV Vars
const { DB_URI, PORT, NODE_ENV } = process.env

const app = express()

// MiddleWare
app.use(helmet({
  referrerPolicy: { policy: 'same-origin' },
  contentSecurityPolicy: {
    directives: {
      blockAllMixedContent: true,
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'"],
      objectSrc: ["'none'"],
      fontSrc: ["'self'"],
      frameSrc: ["'self'"]
    },
    disableAndroid: true
  }
}))
app.use(featurePolicy({
  features: {
    fullscreen: ["'self'"],
    vibrate: ["'self'"],
    payment: ["'self'"],
    syncXhr: ["'none'"]
  }
}))
app.use(timeout.handler({
  timeout: 5000,
  onTimeout: (req, res) => {
    return errorRespone('Service timedout', 'Service unavailable. Please retry', res, 503)
  }
}))
app.use(favicon(join(__dirname, 'public', 'img', 'favicon.png')))
app.use(json())
app.use(compression())
// Passport MiddlewARE
app.use(passport.initialize())
passportConfig()

// Development MiddleWare
if (NODE_ENV === 'development') {
  app.use(volleyball)
}
const databaseOptions = { useNewUrlParser: true }

// Connect to Database
connect(DB_URI, databaseOptions)
  .then(() => {
    console.log('- Database Connected...')
    const port = PORT || 3000
    app.listen(port, () => console.log(`- Server Started On http://localhost:${port}`))

    // Routes
    app.use('/', index)
    app.use('/api/users', users)
    app.use('/api/profile', profile)
    app.use('/api/posts', posts)
    app.use(notFound)
    app.use((err, _req, res, next) => {
      if (err.status === 400) return errorRespone(err.name, err.message, res)
      return next(err)
    })
  })
  .catch(err => {
    const error = {
      name: err.name,
      message: err.message || err.msg
    }
    console.log(error)
  })