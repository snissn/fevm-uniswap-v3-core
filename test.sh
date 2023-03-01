
for file in ./test/*spec.ts
do
  npx hardhat test --network local "$file" | tee -a "$file.result"
done
