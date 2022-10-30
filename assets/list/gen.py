chars = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_"]

# Writing to file
file = open('candidates.txt', 'w')

# Opening file
file1 = open('temp.txt', 'r')

while True:
    line = file1.readline()
    if not line:
            break
    for idx in range(0, 10):
        for op in range(idx, 10):
            file.write("{}{}{}{}{}{}\n".format(line.strip(), idx, idx, op, op, chars[op]))
            if op < 10:
                opp = op + 1
            else:
                opp = op
            file.write("{}{}{}{}{}{}{}\n".format(line.strip(), idx, idx, op, op, chars[op], chars[opp]))
            if (opp < 10):
                oppp = opp + 1
            else:
                oppp = opp
            file.write("{}{}{}{}{}{}{}{}\n".format(line.strip(), idx, idx, op, op, chars[op], chars[opp], chars[oppp])) 
# Closing files
file1.close()
file.close()
