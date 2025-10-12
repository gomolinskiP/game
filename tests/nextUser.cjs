let globalCounter = 0;

function nextUser(context, events, done){
    console.log("globalCounter", globalCounter);
    context.vars.username = `loadUser${globalCounter++}`;
    return done();
}

module.exports = {nextUser};