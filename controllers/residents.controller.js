const Resident = require('../models/residents.model')
const sendSMS = require('../utils/sms')
const randomizer = require('randomstring')
const jwt = require('jsonwebtoken')
const visitorsModel = require('../models/visitors.model')
const estatesModel = require('../models/estates.model')
const testval = require('../utils/testval')

const getAllEstateRecidents = async(req, res) => {
    const esId = req.user
    const {skip, limit} = req.params
    const resp = await Resident.find({esId: esId}).lean().skip(skip).limit(limit||10)
    const count = await Resident.find({esId: esId}).count()
    return res.json({resp, count})
}

const EditRe = async(req,res) => {
    const {firstname, lastname, resId, apartment, number} = req.body
    const found = await Resident.findOne({_id: resId})
    if (!found) return res.status(404).json({message:'not found'})
    found.firstname = firstname
    found.lastname = lastname
    found.number = number
    found.apartment = apartment
    const resp = await found.save()
    return res.status(201).json(resp)
}

const requestRat = async(req, res) => {
    
}

const verifyRat = async(req, res) => {
    const {number} = req.params
    const {code} = req.body
    const found = await Resident.findOne({number: number}).lean()
    if (!found) return res.status(404).json({message: 'Not found'})
    if(!found.crat || found.crat !== code.toUpperCase()) return res.status(401).json({message: 'Incorrect code'})
   
    const accessToken = jwt.sign(
        {userr: found._id},
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: '30m'}
    )
    
    return res.status(201).json({id: '', accessToken, role:2003})

}

const getResidentVisitors = async(req, res) => {
    const id = req.user
    const result = await visitorsModel.find({resId: id}).lean()
    return res.status(201).json(result)
}

const createNewRe = async(req, res) => {
    const {firstname, lastname, esId, apartment, number} = req.body
    const token = randomizer.generate({length:4, charset: 'hex',capitalization: 'uppercase'})+randomizer.generate({length:1,charset: 'alphabetic',capitalization: 'uppercase'})+randomizer.generate({length:1,charset: 'number',capitalization: 'uppercase'})
    const resident = new Resident({firstname, lastname, esId, apartment, number, crat:token})
    const mes = `From ResidentProtect: This is your Resident Pass ${token}. You will need it always to book your visitor into the estate. Please keep it safe and do not disclose it to anyone. www.residentprotect.ng`
    await sendSMS(number, mes)
    const resp = await resident.save()
    return res.status(201).json({...resp, token})
}

const getSingleRe = async(req, res) =>{
    const id = req.user
    const result = await Resident.findOne({_id: id}).lean()
    return res.status(201).json(result)
}


const deleteRe = async(req,res) => {
    const {number} = req.params
    const found = await Resident.findOne({_id: number})
    if (!found) return res.status(404).json({message: 'not found'})
    const resp = await Resident.deleteOne({_id: number})
    return res.status(201).json(resp)
}

module.exports = {getAllEstateRecidents, getResidentVisitors, verifyRat, createNewRe, deleteRe, requestRat, getSingleRe, EditRe}
