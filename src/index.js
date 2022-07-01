require("dotenv").config()
if (!process.env.INSTANCE_ID) throw Error("EC2 Instance Id is undefined")

const axios = require("axios")
const AWS = require("aws-sdk")

AWS.config.update({region: "us-west-2"})
const params = {
    InstanceIds: [process.env.INSTANCE_ID],
}
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'})

const MINUTE = 60000
const TIME_INTERVAL = 5 * MINUTE

const SERVER_IP = "35.84.164.220"
const SERVER_PORT = 25565

const SERVER_DETAILS_ENDPOINT = `https://api.mcsrvstat.us/2/${SERVER_IP}:${SERVER_PORT}`

let nobodyPlaying = false
let serverDown = false

function getPlayerCount(response) {
    const count = response.data?.players?.online
    return count ? count : -1
}

function shutdownServer() {
    console.log("Shutting down server")

    ec2.stopInstances(params, (err, data) => {
        if (err) console.log("Could not stop EC2 instance", err.stack)
        else console.log("EC2 instance stopped successfully", data)
    })

    console.log("\n")
}

function job() {
    axios(SERVER_DETAILS_ENDPOINT)
        .then(response => {
            const count = getPlayerCount(response)
            serverDown = count === -1
            if (serverDown) {
                console.log("Server is down")
                return
            }
            if (count > 0) return

            console.log("Server has no current players.")

            /**
             * if there is 0 players, the flag "nobodyPlaying" will
             * have it's value set to true, and if in the next 5 minutes
             * the player count still 0, the server will be shut down
             */
            if (nobodyPlaying) {
                shutdownServer()
                nobodyPlaying = false   // just to reset the flag
            } else nobodyPlaying = true
        })
        .catch(err => console.log(err))
}

const run = () => {
    job()
    setInterval(job, TIME_INTERVAL)
}

run()