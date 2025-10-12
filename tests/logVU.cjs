function logVU(userContext, events, done){
    console.log("VU index: ", userContext.vars.$vu);
    done();
}

module.exports = { logVU }