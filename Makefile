run:
	node dev

deploy:
	rm /Users/michael-tu/bitbucket/tugan0329.bitbucket.org/websites/cs184/final/*
	cp -a app/. /Users/michael-tu/bitbucket/tugan0329.bitbucket.org/websites/cs184/final/
	git add -A
	git commit
	git push
