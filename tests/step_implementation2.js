const axios = require('axios');
const { expect } = require('chai');

step("The gorest GET public endpoint should return status code 200. This is second test", async () => {
    const response = await axios.get('https://reqres.in/api/users?page=2');
    expect(response.status).to.equal(200);
    console.log(response)
});

step("The gorest POST public endpoint should not return status code 401. This is second test", async () => {
    const response = await axios.post('https://reqres.in/api/users?page=2')
    expect(response.status).to.equal(401);
    console.log(response)

});
