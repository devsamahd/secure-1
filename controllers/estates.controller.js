const Chair = require("../models/chairmen.model")
const Estates = require("../models/estates.model")
const Residents = require("../models/residents.model")
const Visitors = require("../models/visitors.model")
const Security = require("../models/security.model")
const randomizer = require('randomstring')
const bcrypt = require('bcrypt')
const moment = require('moment')
const sendSMS = require("../utils/sms")
const visitorsModel = require("../models/visitors.model")


const getAllEs = async(req, res) => {
    const data = await Estates.find().lean()
    return res.json(data)
}


const addNewEs = async(req, res) => {
    const {name, location, chfname, chlname, type, number, email, endDate} = req.body
     const start = moment(new Date(), "DD-MM-YYYY HH:mm:ss").format("DD-MM-YYYY HH:mm:ss")
    const end = moment(new Date(), "DD-MM-YYYY HH:mm:ss").add(5,'minutes').format("DD-MM-YYYY HH:mm:ss")
    const cn =await Chair.findOne({number: number})
    const ce =await Chair.findOne({email: email})
    if(![name, location, chfname, type, chlname, number, email].every(Boolean)) return res.status(404).json({message: 'Incomplete credentials'})
    if(cn|| ce) return res.status(409).json({message:'duplicate number or email'})
    const estate = new Estates({name, location,type, start, end})
    const data = await estate.save()
    const password = randomizer.generate({length:3, charset: 'alphabetic',capitalization: 'uppercase'})+randomizer.generate({length:3,charset: 'hex',capitalization: 'uppercase'})
    const secpassword = randomizer.generate({length:3, charset: 'alphabetic',capitalization: 'uppercase'})+randomizer.generate({length:3,charset: 'hex',capitalization: 'uppercase'})
    const userid = randomizer.generate({length:3, charset: 'alphabetic',capitalization: 'lowercase'})+randomizer.generate({length:3, charset: 'hex',capitalization: 'lowercase'})
    const user = `rp@${userid}`
    const hashed = await bcrypt.hash(password, 10)
    const sechashed = await bcrypt.hash(secpassword, 10)
    const chair = new Chair({firstname: chfname,  lastname: chlname, esId:data._id, number, password: hashed, email})
    const sec = new Security({name: `${name} security`, user, esId:data._id, password: sechashed})
    await chair.save()
    await sec.save()
      
   
    const mes = `Chairman Phone: ${number}\nChairman Pass: ${password}\nGuard 1: ${user}\nGuard 2: ${secpassword}\nhttps://www.residentprotect.ng`
    
    sendSMS(number, mes)
    return res.json({password, secpassword, user, number})
}

const editEs = async(req, res) => {
    const esId = req.body.esId                                                                                                                                  
    const newName = req.body.name
    const location = req.body.location
    const found = await Estates.findOne({_id: esId}).exec()
    if(!found) return res.json({message: 'Estate doesn\'t exist on our database'})
    found.name = newName
    found.location = location
    const data = await found.save()
    return res.json(data)
}

const deleteEs = async(req,res) => {
    const esId = req.params.id
    const found = await Estates.findOne({_id: esId}).exec()
    if (!found) return res.status(404).json({message:"not found"})
    await Chair.deleteOne({esId: esId})
    await Residents.deleteMany({esId: esId})
    await Visitors.deleteMany({esId: esId})
    await Security.deleteOne({esId: esId})
    const re = await Estates.deleteOne({_id: esId})
    return res.json(re)
}

getEstateVisitors = async(req, res) => {
    const id = req.params?.id
    if (!id) return res.status(403)
    const found = await visitorsModel.find({esId: id}).lean().populate({path: "invitedBy"})
    if (!found) return res.status(404).json({message: "Not found"})
    return res.json(found)
}

const getSingleEs = async(req, res) => {
    const id = req.params?.id 
    if (!id) return res.status(403)
    const found = await Estates.findOne({_id: id}).populate({path: "chairman residentCount totalVisits totalSignin totalExpected re"})
    if (!found) return res.status(404).json({message: "Not found"})
    return res.json(found)
}
 
const renewSubscription = async(req, res) => {
    const id = req.params.id
    const {endDate} = req.body
    const found = await Estates.findOne({_id: id})
    if(!found) return res.status(404).json({message: 'Not found'})
    const today = moment().format("DD-MM-YYYY HH:mm:ss")
    const daty = today > found.end
    found.end =  daty ? moment().add(parseInt(endDate), 'minutes').format("DD-MM-YYYY HH:mm:ss") : moment(found.end, "DD-MM-YYYY HH:mm:ss").add(parseInt(endDate), 'minutes').format("DD-MM-YYYY HH:mm:ss")
    await found.save()
    return res.status(201).json({message:'successful'})


}
 
module.exports = {getAllEs, getEstateVisitors, addNewEs, editEs, deleteEs, getSingleEs, renewSubscription}