const Vi = require('../models/visitors.model')
const Re = require('../models/residents.model')
const Es = require('../models/estates.model')
const randomizer = require('randomstring')
const sendSMS = require('../utils/sms')

const getAllVisitors = async(req, res) => {
    const esId = req.user
    const {skip, limit} = req.params
    const resp = await Vi.find({esId: esId}).lean().skip(skip).limit(limit||10).populate({path:"invitedBy"})
    const count = await Vi.find({esId: esId}).lean().count()
    return res.json({resp, count})
}

const getSingleVisitor = async(req, res) => {
    const {resId} = req.params
    const resp = await Vi.findOne({inviteCode: resId, status:'invited'}).lean().populate({path:'invitedBy'})
    if(!resp) return res.status(404).json({message:'No active invite with this code'})
    return res.status(201).json(resp)
}

const getAllExpectedVisitors = async(req, res) => {
    const {resId} = req.params 
    const resp = await Vi.find({resId, status: 'invited'}).lean()
    return res.json(resp)
}

const createNewVisitor = async(req, res) => {
    const resId = req.user
    const inviteCode = randomizer.generate({length:4, charset: 'hex',capitalization: 'uppercase'})+randomizer.generate({length:1,charset: 'alphabetic',capitalization: 'uppercase'})+randomizer.generate({length:1,charset: 'number',capitalization: 'uppercase'}) 
    const { number } = req.body
    if(![number].every(Boolean)) return res.status(404).json({message: 'Please complete the fields'})
    const isUser = await Re.findOne({_id: resId}).exec()
    if(!isUser || isUser === null) res.status(403).json({message: 'Unauthorized'})
    const Estate = await Es.findOne({_id: isUser.esId})
    const found = await Vi.findOne({number: number, status: 'invited', resId})
    const mes1 = `FROM ${Estate.name.toUpperCase()}. This is your PASS: ${inviteCode}. Please present it at the estate gate for validation. https://www.residentprotect.ng`
  
    const mes2 = `FROM ${Estate.name.toUpperCase()}. This is your PASS: ${found?.inviteCode}. Please present it at the estate gate for validation. https://www.residentprotect.ng`
    
    if(!found){
        const gen = new Vi({number, esId: isUser.esId, resId, inviteCode })
        await gen.save()
        const resp = await sendSMS(number, mes1)
        return res.status(201).json({message: "invite sent"})
    }
    const resp = await sendSMS(number, mes1)
    found.createdAt = new Date()
    await found.save()
    return res.status(201).json({message: "invite sent", resp})
}

module.exports = {getAllVisitors, createNewVisitor, getSingleVisitor, getAllExpectedVisitors}
