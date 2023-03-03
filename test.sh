
for file in ./test/*spec.ts
do
  npx hardhat test --network local "$file" | tee "$file.result"
done
