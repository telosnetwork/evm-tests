require('dotenv').config();

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  console.log("Deploying Reverter");

  const reverter = await deploy('Reverter', {
    from: deployer
  });

  console.log("Deploying Tester");
  const tester = await deploy('Tester', {
    from: deployer,
    args: [reverter.address]
  })

  console.log("Deploying PrecompileTester");
  const precompile_tester = await deploy('StandardPrecompiles', {
    from: deployer
  });

};
module.exports.tags = ['Tester', 'StandardPrecompiles'];
