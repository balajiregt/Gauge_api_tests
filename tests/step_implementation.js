const axios = require('axios');
const { expect } = require('chai');

step("The gorest GET public endpoint should return status code 200", async () => {
    const response = await axios.get('https://reqres.in/api/users?page=2');
    expect(response.status).to.equal(200);
    console.log(response)
});

step("The gorest POST public endpoint should return status code 201", async () => {
    const response = await axios.post('https://reqres.in/api/users?page=2')
    expect(response.status).to.equal(201);
    console.log(response)

});
