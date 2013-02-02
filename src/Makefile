CONCAT_PATH=../sigma.concat.js
MINIFY_PATH=../sigma.min.js
TEMP_PATH=../tmp.js
CLOSURE=compiler.jar
BUILD=.
LICENSE=/* sigmajs.org - an open-source light-weight JavaScript graph drawing library - Version: 0.1 - Author:  Alexis Jacomy - License: MIT */

all: clean concat minify-simple
check:
	gjslint --nojsdoc -r ./ -x "./sigmaintro.js,./sigmaoutro.js"
fix:
	fixjsstyle --nojsdoc -r ./
clean:
	rm -f ${MINIFY_PATH} ${CONCAT_PATH}
concat:
	[ -d ${BUILD} ] || mkdir ${BUILD}
	cat ./intro.js `find ./classes -name "*.js"` ./sigmaintro.js `find ./core -name "*.js"` `find ./public -name "*.js"` ./sigmaoutro.js > ${CONCAT_PATH}
minify-simple: clean concat
	java -jar ${CLOSURE} --compilation_level SIMPLE_OPTIMIZATIONS --js ${CONCAT_PATH} --js_output_file ${MINIFY_PATH}
	echo "${LICENSE}" > ${TEMP_PATH} && cat ${MINIFY_PATH} >> ${TEMP_PATH} && mv ${TEMP_PATH} ${MINIFY_PATH}
minify-advanced: clean concat
	java -jar ${CLOSURE} --compilation_level ADVANCED_OPTIMIZATIONS --js ${CONCAT_PATH} --js_output_file ${MINIFY_PATH}
	echo "${LICENSE}" > ${TEMP_PATH} && cat ${MINIFY_PATH} >> ${TEMP_PATH} && mv ${TEMP_PATH} ${MINIFY_PATH}
