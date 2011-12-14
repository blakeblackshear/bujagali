import sys
import bujagali
t = bujagali.Bujagali(sys.argv[1], sys.argv[2])
f = open(sys.argv[3], 'w')
f.write("define(['bujagali'], function(Bujagali){")
f.write(t.generate())
f.write("});")
f.close()