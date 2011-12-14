import sys
import os
import bujagali

f = open(sys.argv[2], 'w')
f.write("define(['bujagali'], function(Bujagali){")

files = os.listdir(sys.argv[1])
for infile in files:
	t = bujagali.Bujagali(infile, sys.argv[1])
	f.write(t.generate())

f.write("});")
f.close()