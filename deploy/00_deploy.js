require('dotenv').config();

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  console.log("Deploying Reverter");

  const reverter = await deploy('Reverter', {
    from: deployer
  });

  const tester = await deploy('Tester', {
    from: deployer,
    args: [reverter.address]
  })

};
module.exports.tags = ['Tester'];