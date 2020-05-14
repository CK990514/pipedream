const jotform = require('https://github.com/PipedreamHQ/pipedream/components/jotform/jotform.app.js')
const busboy = require('busboy')
const { uuid } = require("uuidv4")

module.exports = {
  name: "new-submission", 
  version: "0.0.1",
  props: {
    http: "$.interface.http",
    jotform,
    formId: { propDefinition: [jotform, "formId"] },
  },
  hooks: {
    async activate() {
      let tag = this.db.get('tag')
      if(!tag){
        tag = uuid()
        this.db.set('tag', tag)
      }
      return (await this.jotform.createHook({
        endpoint: this.http.endpoint,
        formId: this.formId,
        tag,
      }))
    },
    async deactivate() {
      return (await this.typeform.deleteHook({
        formId: this.formId,
        tag: this.db.get('tag'),
      }))
    },
  },
  async run(event) {
    const bb = new busboy({ headers: event.headers });
    let fileData = {}
    let formData = {}

    await new Promise((resolve, reject) => {
      bb.on('file', function (fieldname, file, filename, encoding, mimetype) {
        //console.log('File [%s]: filename=%j; encoding=%j; mimetype=%j', fieldname, filename, encoding, mimetype);
        fileData.file = filename
        fileData.fileName = filename
        fileData.encoding = encoding
        fileData.mimetype = mimetype
        fileData.data = {}
        
        file
        .on('data', data => {
          fileData.data[fieldname] = data.length
        })
      }).on('field', (fieldname, val) => {
        try {
          formData[fieldname] = JSON.parse(val)
        } catch (err) {
          formData[fieldname] = val
        }
      })
      .on("finish", resolve)
      .on('error', reject)
      bb.end(event.body)
    })

    this.$emit(formData, {
      summary: JSON.stringify(formData.rawRequest || formData),
      id: formData.submissionID,
    })
  },
}